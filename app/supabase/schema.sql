-- ============================================================================
-- thrdwheel — Supabase schema
-- ----------------------------------------------------------------------------
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor → New query.
--   2. Paste this whole file and click "Run".
--   3. It's safe to re-run (idempotent).
--
-- Design intent (the product's privacy promise, enforced at the DB layer):
--   • A user can read ONLY their own profile + their partner's basic profile.
--   • A user can read ONLY the couple they belong to.
--   • Users can NEVER write couple links directly — pairing goes exclusively
--     through SECURITY DEFINER functions below, which enforce every rule
--     (single-use codes, no self-pairing, one couple per user).
--   • Chat messages are intentionally NOT stored here — the app keeps them
--     ephemeral, matching the "no history / never snitches" principle.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists public.couples (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  member_a   uuid not null references auth.users (id) on delete cascade,
  member_b   uuid references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  couple_id  uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- New-user hook: auto-create a profile row when someone signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give a profile to anyone who signed up before this ran.
insert into public.profiles (id, name)
select id, coalesce(raw_user_meta_data ->> 'name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Helper: the caller's couple id, read without tripping RLS recursion
-- ----------------------------------------------------------------------------
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.couples  enable row level security;

-- profiles: read own, or your partner's (same couple). No client writes.
drop policy if exists "profiles_read_self_or_partner" on public.profiles;
create policy "profiles_read_self_or_partner"
  on public.profiles for select
  using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.current_couple_id())
  );

-- couples: read only the couple you belong to. No client writes.
drop policy if exists "couples_read_own" on public.couples;
create policy "couples_read_own"
  on public.couples for select
  using (member_a = auth.uid() or member_b = auth.uid());

-- ----------------------------------------------------------------------------
-- Pairing functions (the only way couple links are ever written)
-- ----------------------------------------------------------------------------

-- Short, human-friendly code: 6 chars, no ambiguous 0/O/1/I.
create or replace function public.gen_pair_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- "New here — generate a code": create a pending couple, return its code.
-- Re-running while a pending invite exists returns the same code.
create or replace function public.create_couple()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_existing uuid;
  v_couple   public.couples;
  v_code     text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select couple_id into v_existing from public.profiles where id = v_uid;

  if v_existing is not null then
    select * into v_couple from public.couples where id = v_existing;
    if v_couple.status = 'pending' and v_couple.member_a = v_uid then
      return v_couple.code;              -- resume the same invite
    else
      raise exception 'already_paired';
    end if;
  end if;

  loop
    v_code := public.gen_pair_code();
    exit when not exists (select 1 from public.couples where code = v_code);
  end loop;

  insert into public.couples (code, member_a, status)
  values (v_code, v_uid, 'pending')
  returning * into v_couple;

  update public.profiles set couple_id = v_couple.id where id = v_uid;

  return v_code;
end;
$$;

-- "Enter a code": claim a partner's pending code, activating the couple.
create or replace function public.claim_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_existing uuid;
  v_couple   public.couples;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  p_code := upper(trim(p_code));

  select couple_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    raise exception 'already_paired';
  end if;

  select * into v_couple
    from public.couples
    where code = p_code and status = 'pending' and member_b is null
    for update;

  if not found then
    raise exception 'invalid_code';
  end if;

  if v_couple.member_a = v_uid then
    raise exception 'cannot_pair_self';
  end if;

  update public.couples
    set member_b = v_uid, status = 'active'
    where id = v_couple.id;

  update public.profiles set couple_id = v_couple.id where id = v_uid;

  return v_couple.id;
end;
$$;

-- Demo/testing convenience: leave (and tear down) your current couple.
create or replace function public.leave_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cid uuid;
begin
  select couple_id into v_cid from public.profiles where id = v_uid;
  if v_cid is null then
    return;
  end if;
  update public.profiles set couple_id = null where couple_id = v_cid;
  delete from public.couples where id = v_cid;
end;
$$;

-- ----------------------------------------------------------------------------
-- Grants + realtime
-- ----------------------------------------------------------------------------
grant execute on function public.current_couple_id() to authenticated;
grant execute on function public.create_couple()     to authenticated;
grant execute on function public.claim_code(text)    to authenticated;
grant execute on function public.leave_couple()      to authenticated;

-- Let the "waiting for partner" screen update live when the code is claimed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couples'
  ) then
    alter publication supabase_realtime add table public.couples;
  end if;
end $$;

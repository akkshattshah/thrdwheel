-- ============================================================================
-- thrdwheel — full transcript storage + structured-profile columns
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL Editor (after schema.sql and memories.sql). Re-runnable.
--
-- Stores every message, per person. The never-snitch boundary still holds:
--   • messages RLS → a person can read ONLY their own transcript.
--   • a partner can NEVER read the other's raw messages.
--   • (you, the owner, still see everything via the service role / dashboard.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- messages: full transcript (both the user's lines and the AI's replies)
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  speaker_id uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'ai')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_speaker_idx
  on public.messages (speaker_id, created_at);

alter table public.messages enable row level security;

-- Read only your own transcript. A partner can never read it.
drop policy if exists "messages_read_own" on public.messages;
create policy "messages_read_own"
  on public.messages for select
  using (speaker_id = auth.uid());

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check (speaker_id = auth.uid() and couple_id = public.current_couple_id());

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages for delete
  using (speaker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Structured-profile columns on the existing memories table
-- ----------------------------------------------------------------------------
--   attribute   = what kind of fact (interest, love_language, wishlist, goal, …)
--   sensitivity = 'safe'  → non-sensitive preference, ok to hint the partner
--                 'sensitive' → feelings/conflicts/private; NEVER shareable
alter table public.memories
  add column if not exists attribute text default 'other';

alter table public.memories
  add column if not exists sensitivity text not null default 'sensitive'
  check (sensitivity in ('safe', 'sensitive'));

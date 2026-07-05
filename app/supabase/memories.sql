-- ============================================================================
-- thrdwheel — memory schema (personalization that accumulates over time)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (after schema.sql). Safe to re-run.
--
-- Stores DISTILLED facts, never raw transcripts — so "no chat history" stays
-- literally true. The never-snitch promise is enforced HERE, at the database:
--   • You can read all of YOUR OWN memories.
--   • You can read your partner's memories ONLY where visibility = 'shareable'.
--   • Private memories can never be read by the partner, full stop.
-- ============================================================================

create table if not exists public.memories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  content    text not null,                       -- the distilled fact
  category   text default 'other',                -- interest | preference | person | event | feeling | boundary | other
  visibility text not null default 'private'
             check (visibility in ('private', 'shareable')),
  source     text not null default 'ai'           -- 'ai' (auto-extracted) | 'user'
             check (source in ('ai', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_couple_owner_idx
  on public.memories (couple_id, owner_id);

alter table public.memories enable row level security;

-- Read your own memories (any visibility).
drop policy if exists "memories_read_own" on public.memories;
create policy "memories_read_own"
  on public.memories for select
  using (owner_id = auth.uid());

-- Read your partner's memories — ONLY the ones they've made shareable.
drop policy if exists "memories_read_partner_shareable" on public.memories;
create policy "memories_read_partner_shareable"
  on public.memories for select
  using (
    visibility = 'shareable'
    and owner_id <> auth.uid()
    and couple_id = public.current_couple_id()
  );

-- Create your own memories (auto-extraction inserts here as the signed-in user).
drop policy if exists "memories_insert_own" on public.memories;
create policy "memories_insert_own"
  on public.memories for insert
  with check (owner_id = auth.uid() and couple_id = public.current_couple_id());

-- Edit your own (e.g. promote a fact to 'shareable', fix, or re-categorize).
drop policy if exists "memories_update_own" on public.memories;
create policy "memories_update_own"
  on public.memories for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Delete your own.
drop policy if exists "memories_delete_own" on public.memories;
create policy "memories_delete_own"
  on public.memories for delete
  using (owner_id = auth.uid());

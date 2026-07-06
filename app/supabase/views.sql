-- ============================================================================
-- thrdwheel — readable views (see who each row belongs to, by name)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL Editor. Re-runnable.
--
-- The data is already attributed (messages.speaker_id, memories.owner_id) —
-- these views just join the names in so you can read it at a glance in the
-- Table Editor instead of squinting at UUIDs.
--
-- security_invoker = true → the views respect Row-Level Security. Browsing in
-- the dashboard (as owner) you see everything; if ever hit via the app API, a
-- user still only sees their own rows.
-- ============================================================================

-- ── Every message, with speaker + partner names ──
create or replace view public.v_conversations
with (security_invoker = true) as
select
  m.created_at,
  c.code                          as couple_code,
  ps.name                         as speaker,
  pp.name                         as partner,
  m.role,                          -- 'user' (the person) or 'ai' (the reply)
  m.content,
  m.speaker_id,
  m.couple_id,
  m.id
from public.messages m
join public.couples c            on c.id = m.couple_id
left join public.profiles ps     on ps.id = m.speaker_id
left join public.profiles pp     on pp.id = (
  case when c.member_a = m.speaker_id then c.member_b else c.member_a end
)
order by m.couple_id, m.created_at;

-- ── Every remembered fact, with owner + partner names ──
create or replace view public.v_memories
with (security_invoker = true) as
select
  mem.created_at,
  c.code                          as couple_code,
  po.name                         as owner,
  pp.name                         as partner,
  mem.attribute,
  mem.content,
  mem.sensitivity,                 -- safe | sensitive
  mem.visibility,                  -- shareable | private
  mem.owner_id,
  mem.couple_id,
  mem.id
from public.memories mem
join public.couples c            on c.id = mem.couple_id
left join public.profiles po     on po.id = mem.owner_id
left join public.profiles pp     on pp.id = (
  case when c.member_a = mem.owner_id then c.member_b else c.member_a end
)
order by mem.couple_id, mem.created_at;

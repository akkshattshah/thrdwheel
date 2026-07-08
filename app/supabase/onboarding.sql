-- ============================================================================
-- thrdwheel — onboarding flag
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL Editor. Re-runnable (safe if it already exists).
--
-- Adds profiles.onboarded_at. The app shows the onboarding flow to any signed-in
-- user whose onboarded_at is null, then stamps it once they finish. The seed
-- answers themselves are stored in the memories table (visibility=private).
-- ============================================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

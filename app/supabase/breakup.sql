-- ============================================================================
-- thrdwheel — breakup keeps data (unlink instead of delete)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL Editor. Re-runnable.
--
-- Changes "breakup" so it NO LONGER deletes anything. It unlinks both partners
-- and marks the couple 'ended'. All messages and memories are RETAINED in the
-- database (nothing cascades away), so the history persists for future use.
-- ============================================================================

-- Allow an 'ended' status on couples.
alter table public.couples drop constraint if exists couples_status_check;
alter table public.couples
  add constraint couples_status_check
  check (status in ('pending', 'active', 'ended'));

-- Redefine leave_couple(): unlink both, keep everything.
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

  -- Unlink both partners from the couple…
  update public.profiles set couple_id = null where couple_id = v_cid;
  -- …but KEEP the couple row, and all its messages + memories.
  update public.couples set status = 'ended' where id = v_cid;
end;
$$;

-- ============================================================================
-- Committee preferences become a snapshot of the applicant's choice
-- ============================================================================
-- A preference is a fact about the application at the moment it was submitted:
--   • it must be recordable without the organizer having first published a
--     matching committee row, and
--   • it must not be silently rewritten if a committee is later renamed.
--
-- So the preference carries a snapshot of the choice alongside the id, and the
-- id is a plain reference rather than a foreign key. The organizer-owned
-- `assigned_committee_id` on trishul_registrations keeps its foreign key,
-- because an assignment always points at a real committee.
-- ============================================================================

alter table public.trishul_registration_preferences
  drop constraint if exists trishul_registration_preferences_committee_id_fkey;

alter table public.trishul_registration_preferences
  alter column committee_id drop not null;

alter table public.trishul_registration_preferences
  add column if not exists committee_slug text,
  add column if not exists committee_name text,
  add column if not exists committee_type text;

comment on column public.trishul_registration_preferences.committee_name is 'Snapshot of the committee name as it stood when the applicant chose it. NULL means the name was not published at that time — render as [COMMITTEE NAME — TBD], never backfill a later name.';
comment on column public.trishul_registration_preferences.committee_id is 'Reference to trishul_committees when the organizer has published the roster. Intentionally not a foreign key, so a preference is never blocked or erased by roster changes.';

alter table public.trishul_registration_preferences
  drop constraint if exists trishul_registration_preferences_registration_id_committee_id_key;

create unique index if not exists trishul_registration_preferences_choice_key
  on public.trishul_registration_preferences (registration_id, coalesce(committee_id, committee_slug, 'unset'));

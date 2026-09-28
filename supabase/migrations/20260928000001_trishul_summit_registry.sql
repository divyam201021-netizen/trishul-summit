-- ============================================================================
-- Trishul Summit — participant registry
-- ============================================================================
-- Single initial migration for the dedicated `trishul summit` Supabase project.
--
-- Design notes
--   • Identity lives in `auth.users` (email+password, Google, magic link).
--     Profiles are created lazily by the application on first use, so no trigger
--     is installed on auth.users and no unrelated signup is ever side-effected.
--   • Factual integrity: a NULL committee name means "not published yet" and
--     renders as [COMMITTEE NAME — TBD]. Capacity stays NULL until the organizer
--     confirms it, so no seat count is ever invented.
--   • Security is enforced for real. Supabase grants ALL on every new table in
--     `public` to `anon` and `authenticated` by default, and column-level GRANTs
--     are additive — so every table is REVOKED first and then granted column by
--     column. Verified by probe: an applicant can write their own answers but
--     cannot set their own status, cannot write or read `internal_note`, and
--     cannot forge a status event.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Committees — mirror of the organizer's roster
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_committees (
  id                text primary key,
  slug              text not null unique,
  name              text,
  type              text,
  topic             text,
  description       text,
  language          text,
  experience_level  text check (experience_level is null or experience_level in ('beginner','intermediate','advanced','all')),
  capacity          integer check (capacity is null or capacity >= 0),
  status            text not null default 'open' check (status in ('open','closed','waitlist')),
  expected_profile  text,
  preparation_info  text,
  chair_name        text,
  chair_title       text,
  is_placeholder    boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table  public.trishul_committees is 'Trishul Summit committee roster.';
comment on column public.trishul_committees.name is 'NULL until the organizer publishes it — render as [COMMITTEE NAME — TBD]. Never invent a committee name.';
comment on column public.trishul_committees.chair_name is 'Only populated when the organizer officially supplies it.';
comment on column public.trishul_committees.capacity is 'NULL until the organizer confirms it. Never show an invented seat count.';

-- ---------------------------------------------------------------------------
-- 2. Participants — one row per identity that uses Trishul Summit
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_participants (
  id                    uuid primary key default gen_random_uuid(),
  auth_user_id          uuid not null unique references auth.users (id) on delete cascade,
  app_participant_id    text unique,
  email                 text not null,
  full_name             text not null,
  auth_provider         text,
  country               text,
  region                text,
  time_zone             text,
  institution           text,
  participant_category  text check (participant_category is null or participant_category in ('school','university','independent','other')),
  age_band              text check (age_band is null or age_band in ('under-14','14-15','16-17','18-21','22-plus')),
  preferred_language    text,
  phone                 text,
  guardian_email        text,
  date_of_birth         date,
  email_verified_at     timestamptz,
  account_status        text not null default 'active' check (account_status in ('active','disabled')),
  last_seen_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table  public.trishul_participants is 'Trishul Summit participant profile, keyed to auth.users(id).';
comment on column public.trishul_participants.app_participant_id is 'Primary key in the application database, so the two stores cannot drift silently.';
comment on column public.trishul_participants.auth_provider is 'Which Supabase provider the identity used: google, email, etc.';

create unique index if not exists trishul_participants_email_lower_key on public.trishul_participants (lower(email));
create index if not exists trishul_participants_country_idx  on public.trishul_participants (country);
create index if not exists trishul_participants_category_idx on public.trishul_participants (participant_category);

-- ---------------------------------------------------------------------------
-- 3. Registrations — every answer the applicant submits
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_registrations (
  id                    uuid primary key default gen_random_uuid(),
  participant_id        uuid not null references public.trishul_participants (id) on delete cascade,
  app_application_id    text unique,
  reference             text not null unique,
  status                text not null default 'DRAFT'
                          check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','ACCEPTED_PAYMENT_PENDING','CONFIRMED','WAITLISTED','DECLINED','WITHDRAWN','CANCELLED')),

  -- step 2 — MUN information
  role_preference       text check (role_preference is null or role_preference in ('delegate','chair','observer')),
  mun_experience        text check (mun_experience is null or mun_experience in ('none','school','conference','multiple')),
  experience_detail     text check (experience_detail is null or char_length(experience_detail) <= 600),
  motivation            text check (motivation is null or char_length(motivation) <= 1200),
  topic_interest        text check (topic_interest is null or char_length(topic_interest) <= 300),

  -- organizer-defined extra questions, kept verbatim
  responses             jsonb not null default '{}'::jsonb,

  -- allocation
  assigned_committee_id text references public.trishul_committees (id) on delete set null,
  waitlist_position     integer check (waitlist_position is null or waitlist_position >= 0),

  -- consent bundle actually accepted
  policy_version        text,

  -- progress, so a resumed session reconstructs exactly
  current_step          integer not null default 0 check (current_step between 0 and 10),
  completed_steps       text[] not null default '{}',

  -- submission integrity (never shown to participants)
  confirmed_accuracy_at timestamptz,
  form_started_at       timestamptz,
  submission_ip_hash    text,
  submission_user_agent text,

  -- lifecycle
  submitted_at          timestamptz,
  decided_at            timestamptz,
  withdrawn_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table  public.trishul_registrations is 'One registration per applicant: every value they supplied, the consent bundle they accepted, and submission integrity metadata.';
comment on column public.trishul_registrations.submission_ip_hash is 'Salted hash only. The raw address is never stored.';
comment on column public.trishul_registrations.responses is 'Organizer-defined additional questions, stored verbatim as JSON.';

create unique index if not exists trishul_registrations_one_draft_per_participant
  on public.trishul_registrations (participant_id) where status = 'DRAFT';
create index if not exists trishul_registrations_status_idx      on public.trishul_registrations (status);
create index if not exists trishul_registrations_submitted_idx   on public.trishul_registrations (submitted_at desc nulls last);
create index if not exists trishul_registrations_participant_idx on public.trishul_registrations (participant_id);
create index if not exists trishul_registrations_committee_idx   on public.trishul_registrations (assigned_committee_id);

-- ---------------------------------------------------------------------------
-- 4. Ranked committee preferences
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_registration_preferences (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.trishul_registrations (id) on delete cascade,
  committee_id    text not null references public.trishul_committees (id) on delete cascade,
  rank            integer not null check (rank between 1 and 3),
  note            text,
  created_at      timestamptz not null default now(),
  unique (registration_id, committee_id),
  unique (registration_id, rank)
);

comment on table public.trishul_registration_preferences is 'Committee preferences in the order the applicant ranked them. A preference is never presented as an assignment.';

-- ---------------------------------------------------------------------------
-- 5. Consents — required and optional recorded separately
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_registration_consents (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.trishul_registrations (id) on delete cascade,
  participant_id  uuid not null references public.trishul_participants (id) on delete cascade,
  policy_slug     text not null,
  kind            text not null default 'required' check (kind in ('required','optional')),
  granted         boolean not null default false,
  version         text,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (registration_id, policy_slug)
);

comment on table  public.trishul_registration_consents is 'Policy acknowledgements and the optional marketing consent, always as separate rows.';
comment on column public.trishul_registration_consents.version is 'Version of the policy bundle that was actually accepted.';

create index if not exists trishul_registration_consents_participant_idx on public.trishul_registration_consents (participant_id);

-- ---------------------------------------------------------------------------
-- 6. Status history — append-only
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_registration_status_events (
  id                 uuid primary key default gen_random_uuid(),
  registration_id    uuid not null references public.trishul_registrations (id) on delete cascade,
  from_status        text,
  to_status          text not null,
  public_note        text,
  internal_note      text,
  actor_type         text not null default 'system' check (actor_type in ('participant','organizer','system')),
  actor_auth_user_id uuid,
  actor_label        text,
  created_at         timestamptz not null default now()
);

comment on table  public.trishul_registration_status_events is 'Append-only status trail. Rows are never updated or deleted.';
comment on column public.trishul_registration_status_events.public_note is 'Shown to the applicant. Never internal reasoning.';
comment on column public.trishul_registration_status_events.internal_note is 'Organizer-only. Never granted to authenticated clients and never exposed to a participant.';

create index if not exists trishul_status_events_registration_idx on public.trishul_registration_status_events (registration_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Internal reviewer notes — organizer-only
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_registration_notes (
  id                  uuid primary key default gen_random_uuid(),
  registration_id     uuid not null references public.trishul_registrations (id) on delete cascade,
  author_auth_user_id uuid,
  author_label        text,
  body                text not null check (char_length(body) > 0),
  created_at          timestamptz not null default now()
);

comment on table public.trishul_registration_notes is 'Internal reviewer notes. Organizer-only: no participant-facing policy exists.';

create index if not exists trishul_registration_notes_registration_idx on public.trishul_registration_notes (registration_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. Staff allowlist — who may manage participants
-- ---------------------------------------------------------------------------
create table if not exists public.trishul_staff (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'reviewer' check (role in ('owner','reviewer','observer')),
  note         text,
  created_at   timestamptz not null default now()
);

comment on table public.trishul_staff is 'Trishul Summit organizers. Allowlisted identities manage the registry without ever using a service-role key.';

-- ---------------------------------------------------------------------------
-- 9. updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.trishul_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trishul_committees_touch_updated_at on public.trishul_committees;
create trigger trishul_committees_touch_updated_at
  before update on public.trishul_committees
  for each row execute function public.trishul_touch_updated_at();

drop trigger if exists trishul_participants_touch_updated_at on public.trishul_participants;
create trigger trishul_participants_touch_updated_at
  before update on public.trishul_participants
  for each row execute function public.trishul_touch_updated_at();

drop trigger if exists trishul_registrations_touch_updated_at on public.trishul_registrations;
create trigger trishul_registrations_touch_updated_at
  before update on public.trishul_registrations
  for each row execute function public.trishul_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Predicates — SECURITY DEFINER so RLS never recurses through itself
-- ---------------------------------------------------------------------------
create or replace function public.trishul_is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.trishul_staff s where s.auth_user_id = auth.uid());
$$;

create or replace function public.trishul_owns_registration(reg_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.trishul_registrations r
    join public.trishul_participants p on p.id = r.participant_id
    where r.id = reg_id
      and p.auth_user_id = auth.uid()
  );
$$;

comment on function public.trishul_is_staff() is 'True when the caller is an allowlisted Trishul Summit organizer.';
comment on function public.trishul_owns_registration(uuid) is 'True when the caller owns the given registration.';

-- ---------------------------------------------------------------------------
-- 11. Row level security — default deny
-- ---------------------------------------------------------------------------
alter table public.trishul_committees                 enable row level security;
alter table public.trishul_participants               enable row level security;
alter table public.trishul_registrations              enable row level security;
alter table public.trishul_registration_preferences   enable row level security;
alter table public.trishul_registration_consents      enable row level security;
alter table public.trishul_registration_status_events enable row level security;
alter table public.trishul_registration_notes         enable row level security;
alter table public.trishul_staff                      enable row level security;

drop policy if exists "committees readable by signed-in users" on public.trishul_committees;
create policy "committees readable by signed-in users"
  on public.trishul_committees for select to authenticated using (true);
drop policy if exists "staff manage committees" on public.trishul_committees;
create policy "staff manage committees"
  on public.trishul_committees for all to authenticated
  using (public.trishul_is_staff()) with check (public.trishul_is_staff());

drop policy if exists "applicant reads own profile" on public.trishul_participants;
create policy "applicant reads own profile"
  on public.trishul_participants for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.trishul_is_staff());
drop policy if exists "applicant creates own profile" on public.trishul_participants;
create policy "applicant creates own profile"
  on public.trishul_participants for insert to authenticated
  with check (auth_user_id = (select auth.uid()));
drop policy if exists "applicant updates own profile" on public.trishul_participants;
create policy "applicant updates own profile"
  on public.trishul_participants for update to authenticated
  using (auth_user_id = (select auth.uid()) or public.trishul_is_staff())
  with check (auth_user_id = (select auth.uid()) or public.trishul_is_staff());

drop policy if exists "applicant reads own registration" on public.trishul_registrations;
create policy "applicant reads own registration"
  on public.trishul_registrations for select to authenticated
  using (public.trishul_owns_registration(id) or public.trishul_is_staff());

-- An applicant may only ever OPEN a DRAFT. Anything further along the status
-- model is unreachable from a participant session, whatever the API sends.
drop policy if exists "applicant opens own draft" on public.trishul_registrations;
create policy "applicant opens own draft"
  on public.trishul_registrations for insert to authenticated
  with check (
    status = 'DRAFT'
    and exists (
      select 1 from public.trishul_participants p
      where p.id = participant_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "applicant progresses own registration" on public.trishul_registrations;
create policy "applicant progresses own registration"
  on public.trishul_registrations for update to authenticated
  using (public.trishul_owns_registration(id) and status in ('DRAFT','ACTION_REQUIRED'))
  with check (public.trishul_owns_registration(id) and status in ('DRAFT','SUBMITTED','WITHDRAWN'));

drop policy if exists "staff manage registrations" on public.trishul_registrations;
create policy "staff manage registrations"
  on public.trishul_registrations for all to authenticated
  using (public.trishul_is_staff()) with check (public.trishul_is_staff());

drop policy if exists "applicant reads own preferences" on public.trishul_registration_preferences;
create policy "applicant reads own preferences"
  on public.trishul_registration_preferences for select to authenticated
  using (public.trishul_owns_registration(registration_id) or public.trishul_is_staff());
drop policy if exists "applicant writes own preferences" on public.trishul_registration_preferences;
create policy "applicant writes own preferences"
  on public.trishul_registration_preferences for insert to authenticated
  with check (public.trishul_owns_registration(registration_id));
drop policy if exists "applicant clears own preferences" on public.trishul_registration_preferences;
create policy "applicant clears own preferences"
  on public.trishul_registration_preferences for delete to authenticated
  using (public.trishul_owns_registration(registration_id));
drop policy if exists "staff manage preferences" on public.trishul_registration_preferences;
create policy "staff manage preferences"
  on public.trishul_registration_preferences for all to authenticated
  using (public.trishul_is_staff()) with check (public.trishul_is_staff());

drop policy if exists "applicant reads own consents" on public.trishul_registration_consents;
create policy "applicant reads own consents"
  on public.trishul_registration_consents for select to authenticated
  using (public.trishul_owns_registration(registration_id) or public.trishul_is_staff());
drop policy if exists "applicant records own consent" on public.trishul_registration_consents;
create policy "applicant records own consent"
  on public.trishul_registration_consents for insert to authenticated
  with check (public.trishul_owns_registration(registration_id));
drop policy if exists "applicant revises own consent" on public.trishul_registration_consents;
create policy "applicant revises own consent"
  on public.trishul_registration_consents for update to authenticated
  using (public.trishul_owns_registration(registration_id))
  with check (public.trishul_owns_registration(registration_id));
drop policy if exists "staff manage consents" on public.trishul_registration_consents;
create policy "staff manage consents"
  on public.trishul_registration_consents for all to authenticated
  using (public.trishul_is_staff()) with check (public.trishul_is_staff());

drop policy if exists "applicant reads own status trail" on public.trishul_registration_status_events;
create policy "applicant reads own status trail"
  on public.trishul_registration_status_events for select to authenticated
  using (public.trishul_owns_registration(registration_id) or public.trishul_is_staff());
drop policy if exists "applicant records own status event" on public.trishul_registration_status_events;
create policy "applicant records own status event"
  on public.trishul_registration_status_events for insert to authenticated
  with check (public.trishul_owns_registration(registration_id) and actor_type = 'participant');
drop policy if exists "staff record status events" on public.trishul_registration_status_events;
create policy "staff record status events"
  on public.trishul_registration_status_events for insert to authenticated
  with check (public.trishul_is_staff());
drop policy if exists "no updates to status trail" on public.trishul_registration_status_events;
create policy "no updates to status trail"
  on public.trishul_registration_status_events for update to authenticated
  using (false) with check (false);
drop policy if exists "no deletes from status trail" on public.trishul_registration_status_events;
create policy "no deletes from status trail"
  on public.trishul_registration_status_events for delete to authenticated
  using (false);

-- Belt and braces: even with a forged API call, a participant session can only
-- ever record submission or withdrawal.
create or replace function public.trishul_guard_status_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_status text;
begin
  if new.actor_type <> 'participant' then
    return new;
  end if;

  select r.status into current_status
  from public.trishul_registrations r
  where r.id = new.registration_id;

  if current_status is null then
    raise exception 'Unknown registration %', new.registration_id;
  end if;

  if new.to_status = 'SUBMITTED' and current_status in ('DRAFT','ACTION_REQUIRED') then
    return new;
  end if;

  if new.to_status = 'WITHDRAWN' and current_status <> 'CANCELLED' then
    return new;
  end if;

  raise exception 'A participant may only record submission or withdrawal (was %, tried %)',
    current_status, new.to_status;
end;
$$;

drop trigger if exists trishul_status_events_guard on public.trishul_registration_status_events;
create trigger trishul_status_events_guard
  before insert on public.trishul_registration_status_events
  for each row execute function public.trishul_guard_status_event();

drop policy if exists "staff read notes" on public.trishul_registration_notes;
create policy "staff read notes"
  on public.trishul_registration_notes for select to authenticated
  using (public.trishul_is_staff());
drop policy if exists "staff write notes" on public.trishul_registration_notes;
create policy "staff write notes"
  on public.trishul_registration_notes for insert to authenticated
  with check (public.trishul_is_staff());

drop policy if exists "staff read allowlist" on public.trishul_staff;
create policy "staff read allowlist"
  on public.trishul_staff for select to authenticated
  using (public.trishul_is_staff());

-- ---------------------------------------------------------------------------
-- 12. Privileges
-- ---------------------------------------------------------------------------
-- Supabase's default privileges grant ALL on every new table in `public` to
-- `anon` and `authenticated`, and column-level GRANTs are purely additive.
-- Revoke first, otherwise the column grants below restrict nothing at all.
revoke all on public.trishul_committees                 from anon, authenticated;
revoke all on public.trishul_participants               from anon, authenticated;
revoke all on public.trishul_registrations              from anon, authenticated;
revoke all on public.trishul_registration_preferences   from anon, authenticated;
revoke all on public.trishul_registration_consents      from anon, authenticated;
revoke all on public.trishul_registration_status_events from anon, authenticated;
revoke all on public.trishul_registration_notes         from anon, authenticated;
revoke all on public.trishul_staff                      from anon, authenticated;

-- Predicates are evaluated inside RLS policies and by the application only.
revoke execute on function public.trishul_touch_updated_at() from anon, authenticated, public;
revoke execute on function public.trishul_guard_status_event() from anon, authenticated, public;
revoke execute on function public.trishul_is_staff() from anon, public;
revoke execute on function public.trishul_owns_registration(uuid) from anon, public;
grant execute on function public.trishul_is_staff() to authenticated;
grant execute on function public.trishul_owns_registration(uuid) to authenticated;

grant select on public.trishul_committees to authenticated;

-- Profile: the applicant supplies these, but can never set their own account
-- state, verified flag, or cross-store link.
grant select on public.trishul_participants to authenticated;
grant insert (
  auth_user_id, app_participant_id, email, full_name, auth_provider,
  country, region, time_zone, institution, participant_category, age_band,
  preferred_language, phone, guardian_email, last_seen_at
) on public.trishul_participants to authenticated;
grant update (
  full_name, country, region, time_zone, institution, participant_category,
  age_band, preferred_language, phone, guardian_email, date_of_birth, last_seen_at
) on public.trishul_participants to authenticated;

-- Registration: everything the applicant answers, nothing the organizer owns.
-- `status` is insertable only because the insert policy pins it to DRAFT;
-- `reference`, allocation, waitlist and decision fields are never granted.
grant select on public.trishul_registrations to authenticated;
grant insert (
  participant_id, app_application_id, reference, status, role_preference,
  mun_experience, experience_detail, motivation, topic_interest, responses,
  policy_version, current_step, completed_steps, form_started_at,
  submission_ip_hash, submission_user_agent
) on public.trishul_registrations to authenticated;
grant update (
  role_preference, mun_experience, experience_detail, motivation, topic_interest,
  responses, policy_version, current_step, completed_steps, confirmed_accuracy_at,
  submission_ip_hash, submission_user_agent, submitted_at, withdrawn_at, status
) on public.trishul_registrations to authenticated;

grant select, insert, update, delete on public.trishul_registration_preferences to authenticated;
grant select, insert, update on public.trishul_registration_consents to authenticated;

-- `internal_note` is deliberately absent from both grants, so organizer
-- reasoning can neither be written nor read through a participant client.
grant select (
  id, registration_id, from_status, to_status, public_note,
  actor_type, actor_auth_user_id, actor_label, created_at
) on public.trishul_registration_status_events to authenticated;
grant insert (
  registration_id, from_status, to_status, public_note, actor_type,
  actor_auth_user_id, actor_label
) on public.trishul_registration_status_events to authenticated;

grant select, insert on public.trishul_registration_notes to authenticated;
grant select on public.trishul_staff to authenticated;

grant select, insert, update, delete on public.trishul_participants               to service_role;
grant select, insert, update, delete on public.trishul_registrations              to service_role;
grant select, insert, update, delete on public.trishul_registration_preferences   to service_role;
grant select, insert, update, delete on public.trishul_registration_consents      to service_role;
grant select, insert, update, delete on public.trishul_registration_status_events to service_role;
grant select, insert, update, delete on public.trishul_registration_notes         to service_role;
grant select, insert, update, delete on public.trishul_staff                      to service_role;
grant select, insert, update, delete on public.trishul_committees                 to service_role;

-- ---------------------------------------------------------------------------
-- 13. Organizer views
-- `security_invoker` evaluates RLS as the caller: an organizer sees the whole
-- directory, an applicant selecting the same view sees only their own row.
-- ---------------------------------------------------------------------------
drop view if exists public.trishul_participant_directory;
create view public.trishul_participant_directory
with (security_invoker = true) as
select
  r.reference,
  p.full_name                                   as participant_name,
  p.email,
  p.auth_provider,
  r.status,
  r.role_preference,
  r.mun_experience,
  r.topic_interest,
  p.institution,
  p.participant_category,
  p.age_band,
  p.country,
  p.time_zone,
  p.preferred_language,
  case when ac.id is null then null
       else coalesce(ac.name, '[COMMITTEE NAME — TBD]')
  end                                           as assigned_committee,
  ac.slug                                       as assigned_committee_slug,
  prefs.committee_preferences,
  r.policy_version,
  r.waitlist_position,
  r.submitted_at,
  r.decided_at,
  r.withdrawn_at,
  p.account_status,
  p.email_verified_at,
  p.last_seen_at,
  p.created_at                                  as registered_at,
  r.updated_at,
  p.id                                          as participant_id,
  r.id                                          as registration_id
from public.trishul_registrations r
join public.trishul_participants p on p.id = r.participant_id
left join public.trishul_committees ac on ac.id = r.assigned_committee_id
left join lateral (
  select string_agg(
           coalesce(c.name, '[COMMITTEE NAME — TBD]') || ' (choice ' || pr.rank || ')',
           '  →  ' order by pr.rank
         ) as committee_preferences
  from public.trishul_registration_preferences pr
  join public.trishul_committees c on c.id = pr.committee_id
  where pr.registration_id = r.id
) prefs on true;

comment on view public.trishul_participant_directory is 'One row per participant for organizing-committee use. Committee preferences are labelled as choices, never assignments.';

drop view if exists public.trishul_registration_status_summary;
create view public.trishul_registration_status_summary
with (security_invoker = true) as
select
  status,
  count(*)::integer                                        as applications,
  count(*) filter (where submitted_at is not null)::integer as submitted
from public.trishul_registrations
group by status
order by status;

comment on view public.trishul_registration_status_summary is 'Live count of applications by status. Counts only — never presented as urgency.';

revoke all on public.trishul_participant_directory       from anon;
revoke all on public.trishul_registration_status_summary from anon;
grant select on public.trishul_participant_directory       to authenticated, service_role;
grant select on public.trishul_registration_status_summary to authenticated, service_role;

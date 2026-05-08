-- Referral Command Center starter schema for Supabase/Postgres
-- Phase 1: pilot-ready structure. Avoid real PHI until HIPAA/BAA/security review is complete.

create extension if not exists pgcrypto;

create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  facility_id uuid references facilities(id) on delete cascade,
  full_name text,
  role text not null default 'admissions' check (role in ('admissions','don','administrator','corporate','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists referral_sources (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  source_name text not null,
  contact_person text,
  phone text,
  email text,
  average_referrals_per_month numeric,
  conversion_rate numeric,
  last_contact_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  referral_source_id uuid references referral_sources(id) on delete set null,
  patient_initials text not null,
  referral_source text not null,
  hospital_contact text,
  received_at timestamptz not null default now(),
  payer text not null,
  diagnosis text,
  skilled_need text,
  requested_admit_date date,
  status text not null default 'New Referral' check (status in ('New Referral','Under Clinical Review','Need More Info','Accepted','Pending Auth','Admitted','Lost / Declined')),
  priority text not null default 'Medium Priority' check (priority in ('High Priority','Medium Priority','Low Priority')),
  assigned_to uuid references profiles(id) on delete set null,
  missing_documents text,
  next_follow_up_at timestamptz,
  accepted_at timestamptz,
  admitted_at timestamptz,
  lost_reason text,
  lost_notes text,
  notes text,
  response_minutes integer default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  referral_id uuid not null references referrals(id) on delete cascade,
  follow_up_at timestamptz not null,
  follow_up_type text,
  assigned_to uuid references profiles(id) on delete set null,
  outcome text,
  next_step text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id) on delete cascade,
  referral_id uuid references referrals(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  event_type text not null,
  event_detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_facility_status on referrals(facility_id, status);
create index if not exists idx_referrals_facility_received on referrals(facility_id, received_at desc);
create index if not exists idx_referrals_followup on referrals(facility_id, next_follow_up_at) where next_follow_up_at is not null;

-- RLS starter policies: users can only access rows for their facility.
alter table facilities enable row level security;
alter table profiles enable row level security;
alter table referral_sources enable row level security;
alter table referrals enable row level security;
alter table follow_ups enable row level security;
alter table audit_events enable row level security;

create policy "profiles_select_own_facility" on profiles for select using (
  id = auth.uid() or facility_id in (select facility_id from profiles where id = auth.uid())
);

create policy "referrals_facility_access" on referrals for all using (
  facility_id in (select facility_id from profiles where id = auth.uid())
) with check (
  facility_id in (select facility_id from profiles where id = auth.uid())
);

create policy "sources_facility_access" on referral_sources for all using (
  facility_id in (select facility_id from profiles where id = auth.uid())
) with check (
  facility_id in (select facility_id from profiles where id = auth.uid())
);

create policy "followups_facility_access" on follow_ups for all using (
  facility_id in (select facility_id from profiles where id = auth.uid())
) with check (
  facility_id in (select facility_id from profiles where id = auth.uid())
);

create policy "audit_facility_select" on audit_events for select using (
  facility_id in (select facility_id from profiles where id = auth.uid())
);

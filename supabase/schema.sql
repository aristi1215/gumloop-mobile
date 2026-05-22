-- Gumloop Native — Supabase schema.
--
-- This schema models the application's persistence layer. It assumes the
-- standard Supabase `auth` schema (auth.users) is in place. All tables are
-- protected by row-level security so each user can only read/write their
-- own data; organization admins gain expanded access via the
-- `is_org_admin()` helper.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  gumloop_org_id  text unique,
  created_at      timestamptz not null default now()
);

create table if not exists public.workspaces (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  gumloop_project_id  text,
  created_at          timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  display_name          text,
  avatar_url            text,
  organization_id       uuid references public.organizations(id) on delete set null,
  active_workspace_id   uuid references public.workspaces(id) on delete set null,
  gumloop_user_id       text,
  role                  text not null default 'member' check (role in ('owner','admin','member')),
  created_at            timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid unique not null references public.user_profiles(id) on delete cascade,
  enabled               boolean not null default true,
  failure_alerts        boolean not null default true,
  termination_alerts    boolean not null default true,
  completion_alerts     boolean not null default false,
  polling_interval_ms   integer not null default 15000,
  flow_overrides        jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

create table if not exists public.monitored_flows (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.user_profiles(id) on delete cascade,
  workspace_id            uuid references public.workspaces(id) on delete set null,
  saved_item_id           text not null,
  flow_name               text not null,
  is_pinned               boolean not null default false,
  notify_on_failure       boolean not null default true,
  notify_on_termination   boolean not null default true,
  notify_on_completion    boolean not null default false,
  created_at              timestamptz not null default now(),
  unique (user_id, saved_item_id)
);

create table if not exists public.cached_runs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  run_id          text not null,
  saved_item_id   text not null,
  flow_name       text,
  state           text not null,
  created_ts      timestamptz not null,
  finished_ts     timestamptz,
  duration_ms     integer,
  payload         jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  unique (user_id, run_id)
);

create index if not exists cached_runs_user_state_idx
  on public.cached_runs (user_id, state, created_ts desc);

create table if not exists public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  category        text not null check (category in ('failure','termination','completion')),
  title           text not null,
  body            text not null,
  run_id          text not null,
  saved_item_id   text not null,
  flow_name       text not null,
  state           text not null,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_log_cache (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id        text not null,
  event_type      text not null,
  user_id         text not null,
  details         text not null,
  source_ip       text,
  user_agent      text,
  occurred_at     timestamptz not null,
  cached_at       timestamptz not null default now(),
  unique (organization_id, event_id)
);

create index if not exists audit_log_cache_org_time_idx
  on public.audit_log_cache (organization_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and organization_id = target_org
      and role in ('owner','admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations              enable row level security;
alter table public.workspaces                 enable row level security;
alter table public.user_profiles              enable row level security;
alter table public.notification_preferences   enable row level security;
alter table public.monitored_flows            enable row level security;
alter table public.cached_runs                enable row level security;
alter table public.notifications              enable row level security;
alter table public.audit_log_cache            enable row level security;

-- Profile self-access
create policy if not exists user_profiles_self_select
  on public.user_profiles for select using (id = auth.uid());
create policy if not exists user_profiles_self_update
  on public.user_profiles for update using (id = auth.uid());
create policy if not exists user_profiles_self_insert
  on public.user_profiles for insert with check (id = auth.uid());

-- Organization read for members
create policy if not exists organizations_member_select on public.organizations
  for select using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.organization_id = organizations.id
    )
  );

-- Workspaces — readable by org members, writable by admins
create policy if not exists workspaces_member_select on public.workspaces
  for select using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.organization_id = workspaces.organization_id
    )
  );
create policy if not exists workspaces_admin_write on public.workspaces
  for all using (public.is_org_admin(workspaces.organization_id))
  with check (public.is_org_admin(workspaces.organization_id));

-- Notification preferences
create policy if not exists notif_prefs_self_all on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Monitored flows
create policy if not exists monitored_flows_self_all on public.monitored_flows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cached runs
create policy if not exists cached_runs_self_all on public.cached_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifications
create policy if not exists notifications_self_all on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit log cache — only org admins
create policy if not exists audit_log_admin_select on public.audit_log_cache
  for select using (public.is_org_admin(audit_log_cache.organization_id));
create policy if not exists audit_log_admin_write on public.audit_log_cache
  for all using (public.is_org_admin(audit_log_cache.organization_id))
  with check (public.is_org_admin(audit_log_cache.organization_id));

-- ---------------------------------------------------------------------------
-- Triggers — sync auth.users → user_profiles
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

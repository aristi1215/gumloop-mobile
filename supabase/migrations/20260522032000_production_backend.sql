-- Production backend for Gumloop Native.
-- Idempotent enough for local replays while still safe on a fresh Supabase project.

create extension if not exists "uuid-ossp";

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  gumloop_org_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  gumloop_project_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  organization_id uuid references public.organizations(id) on delete set null,
  active_workspace_id uuid references public.workspaces(id) on delete set null,
  gumloop_user_id text,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.user_profiles(id) on delete cascade,
  enabled boolean not null default true,
  failure_alerts boolean not null default true,
  termination_alerts boolean not null default true,
  completion_alerts boolean not null default false,
  polling_interval_ms integer not null default 15000 check (polling_interval_ms between 5000 and 300000),
  flow_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.monitored_flows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  saved_item_id text not null,
  flow_name text not null,
  is_pinned boolean not null default false,
  notify_on_failure boolean not null default true,
  notify_on_termination boolean not null default true,
  notify_on_completion boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, saved_item_id)
);

create table if not exists public.cached_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  run_id text not null,
  saved_item_id text not null,
  flow_name text,
  state text not null,
  created_ts timestamptz not null,
  finished_ts timestamptz,
  duration_ms integer,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, run_id)
);

create index if not exists cached_runs_user_state_idx
  on public.cached_runs (user_id, state, created_ts desc);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  category text not null check (category in ('failure','termination','completion')),
  title text not null,
  body text not null,
  run_id text not null,
  saved_item_id text not null,
  flow_name text not null,
  state text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_log_cache (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  user_id text not null,
  user_email text,
  details text not null,
  source_ip text not null default '',
  user_agent text not null default '',
  occurred_at timestamptz not null,
  cached_at timestamptz not null default now(),
  unique (organization_id, event_id)
);

create index if not exists audit_log_cache_org_time_idx
  on public.audit_log_cache (organization_id, occurred_at desc);

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and organization_id = target_org
      and role in ('owner','admin')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists set_cached_runs_updated_at on public.cached_runs;
create trigger set_cached_runs_updated_at
  before update on public.cached_runs
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_user_workspace(
  p_default_org_name text default 'Gumloop',
  p_default_workspace_name text default 'Production',
  p_gumloop_org_id text default null,
  p_gumloop_project_id text default null,
  p_gumloop_user_id text default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  org public.organizations%rowtype;
  workspace public.workspaces%rowtype;
  profile public.user_profiles%rowtype;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select email into user_email from auth.users where id = uid;

  select * into profile from public.user_profiles where id = uid;
  if profile.organization_id is not null and profile.active_workspace_id is not null then
    update public.user_profiles
    set gumloop_user_id = coalesce(nullif(p_gumloop_user_id, ''), public.user_profiles.gumloop_user_id)
    where id = uid
    returning * into profile;

    insert into public.notification_preferences (user_id)
    values (uid)
    on conflict (user_id) do nothing;

    return profile;
  end if;

  insert into public.organizations (name, gumloop_org_id)
  values (coalesce(nullif(p_default_org_name, ''), 'Gumloop'), nullif(p_gumloop_org_id, ''))
  on conflict (gumloop_org_id) do update set name = excluded.name
  returning * into org;

  if org.id is null then
    select * into org
    from public.organizations
    where gumloop_org_id = nullif(p_gumloop_org_id, '')
    limit 1;
  end if;

  insert into public.workspaces (organization_id, name, gumloop_project_id)
  values (org.id, coalesce(nullif(p_default_workspace_name, ''), 'Production'), nullif(p_gumloop_project_id, ''))
  returning * into workspace;

  insert into public.user_profiles (
    id,
    email,
    display_name,
    organization_id,
    active_workspace_id,
    gumloop_user_id,
    role
  )
  values (
    uid,
    coalesce(user_email, ''),
    coalesce(user_email, 'Operator'),
    org.id,
    workspace.id,
    nullif(p_gumloop_user_id, ''),
    'owner'
  )
  on conflict (id) do update set
    email = excluded.email,
    organization_id = coalesce(public.user_profiles.organization_id, excluded.organization_id),
    active_workspace_id = coalesce(public.user_profiles.active_workspace_id, excluded.active_workspace_id),
    gumloop_user_id = coalesce(nullif(excluded.gumloop_user_id, ''), public.user_profiles.gumloop_user_id),
    role = case
      when public.user_profiles.organization_id is null then 'owner'
      else public.user_profiles.role
    end
  returning * into profile;

  insert into public.notification_preferences (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  return profile;
end;
$$;

alter table public.organizations enable row level security;
alter table public.workspaces enable row level security;
alter table public.user_profiles enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.monitored_flows enable row level security;
alter table public.cached_runs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log_cache enable row level security;

drop policy if exists user_profiles_self_select on public.user_profiles;
create policy user_profiles_self_select
  on public.user_profiles for select using (id = auth.uid());

drop policy if exists user_profiles_self_update on public.user_profiles;
create policy user_profiles_self_update
  on public.user_profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_profiles_self_insert on public.user_profiles;
create policy user_profiles_self_insert
  on public.user_profiles for insert with check (id = auth.uid());

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations
  for select using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.organization_id = organizations.id
    )
  );

drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces
  for select using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.organization_id = workspaces.organization_id
    )
  );

drop policy if exists workspaces_admin_write on public.workspaces;
create policy workspaces_admin_write on public.workspaces
  for all using (public.is_org_admin(workspaces.organization_id))
  with check (public.is_org_admin(workspaces.organization_id));

drop policy if exists notif_prefs_self_all on public.notification_preferences;
create policy notif_prefs_self_all on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists monitored_flows_self_all on public.monitored_flows;
create policy monitored_flows_self_all on public.monitored_flows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cached_runs_self_all on public.cached_runs;
create policy cached_runs_self_all on public.cached_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_self_all on public.notifications;
create policy notifications_self_all on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists audit_log_admin_select on public.audit_log_cache;
create policy audit_log_admin_select on public.audit_log_cache
  for select using (public.is_org_admin(audit_log_cache.organization_id));

drop policy if exists audit_log_admin_write on public.audit_log_cache;
create policy audit_log_admin_write on public.audit_log_cache
  for all using (public.is_org_admin(audit_log_cache.organization_id))
  with check (public.is_org_admin(audit_log_cache.organization_id));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

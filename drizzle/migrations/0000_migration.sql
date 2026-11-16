-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Own profile readable" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Own profile updatable" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins grant roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins revoke roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin') and user_id <> auth.uid());

-- New user bootstrap: profile + default role; the master account becomes admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'tunavinetwork@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Global platform settings (single row)
create table public.app_settings (
  id int primary key default 1,
  active_model text not null default 'openai/gpt-6-astra',
  system_prompt text not null default '',
  max_output_tokens int not null default 4000,
  daily_message_limit int not null default 200,
  chat_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'A TUNAVI está em manutenção. Volte em instantes.',
  modules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint app_settings_singleton check (id = 1)
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Settings are public" on public.app_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.app_settings (id) values (1);

-- Audit log
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Admins read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins write audit" on public.audit_logs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and actor_id = auth.uid());

-- AI usage (written by the server only)
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  feature text not null default 'chat',
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_created_at_idx on public.ai_usage (created_at desc);
grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;
alter table public.ai_usage enable row level security;
create policy "Admins read usage" on public.ai_usage for select to authenticated using (public.has_role(auth.uid(), 'admin'));
-- ═══════════════════════════════════════════════════════════════
-- pump.zeen — قاعدة البيانات والصلاحيات
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor → New query → Run
-- كل الحماية هنا (RLS + دوال تتحقق من الدور)، والمتصفح لا يُوثق به
-- ═══════════════════════════════════════════════════════════════

-- ── الإعدادات العامة (صف واحد) ──
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  signups_open boolean not null default true,
  admin_email text            -- بريد المدير؛ إن تُرك فارغاً يصبح أول مستخدم مديراً
);
insert into public.app_settings (id) values (1) on conflict do nothing;
alter table public.app_settings enable row level security;   -- لا سياسات = لا وصول مباشر

-- ── الملفات الشخصية ──
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text check (char_length(full_name) <= 60),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profile: read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
-- لا تحديث مباشر للدور: نسمح بتعديل الاسم فقط
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;
create policy "profile: update own name" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ── التصاميم ──
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists designs_owner_idx on public.designs (owner, updated_at desc);
alter table public.designs enable row level security;
create policy "designs: own rows" on public.designs for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on public.designs from anon;

-- تحديث updated_at ومنع تغيير المالك، وحد أقصى 200 تصميم لكل مستخدم
create or replace function public.designs_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.owner := auth.uid();
    if (select count(*) from public.designs where owner = new.owner) >= 200 then
      raise exception 'design limit reached';
    end if;
  else
    new.owner := old.owner;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists designs_guard on public.designs;
create trigger designs_guard before insert or update on public.designs for each row execute function public.designs_guard();

-- ── عند تسجيل مستخدم جديد ──
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.app_settings; is_first boolean;
begin
  select * into s from public.app_settings where id = 1;
  select not exists (select 1 from public.profiles where role = 'admin') into is_first;
  if not s.signups_open and not is_first and lower(new.email) is distinct from lower(s.admin_email) then
    raise exception 'signups closed';
  end if;
  insert into public.profiles (id, full_name, role)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 60),
          case when lower(new.email) = lower(s.admin_email) or (s.admin_email is null and is_first) then 'admin' else 'user' end);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── التحقق من المدير ──
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;

-- ── دوال لوحة الإدارة (كلها تتحقق من الدور أولاً) ──
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return json_build_object(
    'users', (select count(*) from auth.users),
    'designs', (select count(*) from public.designs),
    'active7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'new7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups_open', (select signups_open from public.app_settings where id = 1));
end $$;

create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, role text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, designs bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return query
    select u.id, u.email::text, p.full_name, p.role, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
           (select count(*) from public.designs d where d.owner = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc limit 500;
end $$;

create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if new_role not in ('user', 'admin') then raise exception 'bad role'; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception 'cannot demote yourself'; end if;
  update public.profiles set role = new_role where id = target;
end $$;

create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if target = auth.uid() then raise exception 'cannot delete yourself'; end if;
  delete from auth.users where id = target;
end $$;

create or replace function public.admin_set_signups(open boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.app_settings set signups_open = open where id = 1;
end $$;

create or replace function public.admin_designs()
returns table (id uuid, name text, owner_email text, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return query select d.id, d.name, u.email::text, d.updated_at
    from public.designs d join auth.users u on u.id = d.owner order by d.updated_at desc limit 300;
end $$;

create or replace function public.admin_auth_log()
returns table (at timestamptz, email text, action text, ip text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return query select a.created_at, (a.payload ->> 'actor_username')::text, (a.payload ->> 'action')::text, a.ip_address::text
    from auth.audit_log_entries a order by a.created_at desc limit 100;
end $$;

-- ── صلاحيات التنفيذ: لا شيء للزائر غير المسجّل ──
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin(), public.admin_overview(), public.admin_users(), public.admin_set_role(uuid, text),
  public.admin_delete_user(uuid), public.admin_set_signups(boolean), public.admin_designs(), public.admin_auth_log() to authenticated;

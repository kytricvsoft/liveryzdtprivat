-- Jalankan seluruh SQL ini di Supabase > SQL Editor > New query.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ZDT Member',
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'member'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.liveries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body_code text not null,
  glass_code text not null,
  image_url text not null,
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  livery_id uuid not null references public.liveries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, livery_id)
);

alter table public.profiles enable row level security;
alter table public.liveries enable row level security;
alter table public.favorites enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

drop policy if exists "members can read profiles" on public.profiles;
create policy "members can read profiles" on public.profiles
for select to authenticated using (true);

drop policy if exists "members can read liveries" on public.liveries;
create policy "members can read liveries" on public.liveries
for select to authenticated using (true);

drop policy if exists "admins can insert liveries" on public.liveries;
create policy "admins can insert liveries" on public.liveries
for insert to authenticated with check (public.is_admin());

drop policy if exists "admins can delete liveries" on public.liveries;
create policy "admins can delete liveries" on public.liveries
for delete to authenticated using (public.is_admin());

drop policy if exists "members manage own favorites" on public.favorites;
create policy "members manage own favorites" on public.favorites
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Buat bucket gambar publik (foto bisa dilihat semua member yang sudah login).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('livery-images', 'livery-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "authenticated users can view livery images" on storage.objects;
create policy "authenticated users can view livery images" on storage.objects
for select to authenticated using (bucket_id = 'livery-images');

drop policy if exists "admins can upload livery images" on storage.objects;
create policy "admins can upload livery images" on storage.objects
for insert to authenticated with check (bucket_id = 'livery-images' and public.is_admin());

drop policy if exists "admins can delete livery images" on storage.objects;
create policy "admins can delete livery images" on storage.objects
for delete to authenticated using (bucket_id = 'livery-images' and public.is_admin());

-- PENTING: setelah membuat akun KYY lewat Supabase Authentication > Users,
-- ganti email di bawah dengan email akun KYY, lalu jalankan query ini:
-- update public.profiles p set role = 'admin'
-- from auth.users u where p.id = u.id and u.email = 'EMAIL_KYY';

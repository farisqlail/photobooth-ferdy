create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "Public can read templates"
on public.templates
for select
to anon, authenticated
using (true);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date timestamptz not null default now(),
  total_photos integer not null default 0,
  total_price numeric(10, 2) not null default 0,
  status text not null check (status in ('success', 'canceled'))
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  original_url text not null,
  filtered_url text,
  template_id uuid references public.templates(id)
);

create table if not exists public.analytics (
  id bigserial primary key,
  period_type text not null check (period_type in ('daily', 'monthly')),
  period_date date not null,
  page_views integer not null default 0,
  booth_usage integer not null default 0,
  created_at timestamptz not null default now(),
  unique (period_type, period_date)
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('cash', 'non_cash')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  total_price numeric(10, 2) not null default 0,
  payment_method text,
  payment_status text not null check (payment_status in ('pending', 'paid', 'canceled')) default 'pending',
  template_id uuid references public.templates(id),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_settings (
  id uuid primary key default gen_random_uuid(),
  base_price numeric(10, 2) not null default 0,
  per_print_price numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists photos_session_id_idx on public.photos(session_id);
create index if not exists photos_template_id_idx on public.photos(template_id);
create index if not exists analytics_period_date_idx on public.analytics(period_date);
create index if not exists payment_methods_active_idx on public.payment_methods(is_active);
create index if not exists transactions_created_at_idx on public.transactions(created_at);
create index if not exists pricing_settings_updated_at_idx on public.pricing_settings(updated_at);

insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('captures', 'captures', true)
on conflict (id) do update set public = true;

create policy "Admins can upload template overlays"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() or email = auth.jwt()->>'email'
  )
);

create policy "Admins can update template overlays"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() or email = auth.jwt()->>'email'
  )
);

create policy "Admins can delete template overlays"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'templates'
  and exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() or email = auth.jwt()->>'email'
  )
);

create policy "Public can read template objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'templates');

-- Policies for captures bucket
create policy "Public can upload captures"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'captures');

create policy "Public can read captures"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'captures');

create policy "Public can update captures"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'captures');

-- Policies for transactions
alter table public.transactions enable row level security;

create policy "Public can insert transactions"
on public.transactions
for insert
to anon, authenticated
with check (true);

create policy "Public can read transactions"
on public.transactions
for select
to anon, authenticated
using (true);

create policy "Public can update transactions"
on public.transactions
for update
to anon, authenticated
using (true);

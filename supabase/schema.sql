-- Bodegapp / PharmaStock - Schema base para Supabase (Postgres)
-- Ejecuta este script en: Supabase Dashboard -> SQL Editor

create extension if not exists pgcrypto;

-- Utilidad: updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Catálogo / inventario
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  inventory_type text not null default '772',
  siges_code text,
  sicop_classifier text,
  sicop_identifier text,
  name text not null,
  category text,
  batch text,
  expiry_date date,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migracion segura si ya existia la tabla
alter table if exists public.medications
  add column if not exists inventory_type text not null default '772';

alter table if exists public.medications
  alter column stock type numeric using stock::numeric;

alter table if exists public.medications
  alter column min_stock type numeric using min_stock::numeric;

drop trigger if exists trg_medications_updated_at on public.medications;
create trigger trg_medications_updated_at
before update on public.medications
for each row execute function public.set_updated_at();

create index if not exists idx_medications_siges_code on public.medications (siges_code);
create index if not exists idx_medications_name on public.medications (name);
create index if not exists idx_medications_inventory_type on public.medications (inventory_type);

-- Consumo mensual
create table if not exists public.monthly_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_batches_label_unique unique (label)
);

drop trigger if exists trg_monthly_batches_updated_at on public.monthly_batches;
create trigger trg_monthly_batches_updated_at
before update on public.monthly_batches
for each row execute function public.set_updated_at();

create table if not exists public.monthly_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.monthly_batches(id) on delete cascade,
  siges_code text,
  medication_name text,
  quantity numeric not null default 0,
  cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_monthly_batch_items_batch_id on public.monthly_batch_items (batch_id);

-- RLS (recomendado). Actualmente permite acceso a `anon` y `authenticated`.
-- Si más adelante activas login, puedes ajustar estas policies para restringir por usuario/rol.
alter table public.medications enable row level security;
alter table public.monthly_batches enable row level security;
alter table public.monthly_batch_items enable row level security;

drop policy if exists "public_full_access" on public.medications;
create policy "public_full_access"
on public.medications
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_full_access" on public.monthly_batches;
create policy "public_full_access"
on public.monthly_batches
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_full_access" on public.monthly_batch_items;
create policy "public_full_access"
on public.monthly_batch_items
for all
to anon, authenticated
using (true)
with check (true);

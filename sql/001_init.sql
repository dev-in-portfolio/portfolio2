-- Enable uuid generation
create extension if not exists pgcrypto;

-- Latches
create table if not exists public.latches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- Latch items
create type public.latch_phase as enum ('draft','ready','locked');

create table if not exists public.latch_items (
  id uuid primary key default gen_random_uuid(),
  latch_id uuid not null references public.latches(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  body text not null default '',
  phase public.latch_phase not null default 'draft',
  proof_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proofs
create type public.proof_kind as enum ('note','link','file');

create table if not exists public.item_proofs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.latch_items(id) on delete cascade,
  user_id uuid not null,
  kind public.proof_kind not null,
  label text not null default '',
  note text not null default '',
  url text not null default '',
  storage_path text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_latches_user_time on public.latches(user_id, created_at desc);
create index if not exists idx_items_latch_phase on public.latch_items(latch_id, phase);
create index if not exists idx_proofs_item on public.item_proofs(item_id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_items on public.latch_items;
create trigger trg_touch_items
before update on public.latch_items
for each row execute function public.touch_updated_at();

-- RLS policies
alter table public.latches enable row level security;
alter table public.latch_items enable row level security;
alter table public.item_proofs enable row level security;

create policy "latches_select_own"
on public.latches for select
using (user_id = auth.uid());

create policy "latches_insert_own"
on public.latches for insert
with check (user_id = auth.uid());

create policy "latches_update_own"
on public.latches for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "latches_delete_own"
on public.latches for delete
using (user_id = auth.uid());

create policy "items_select_own"
on public.latch_items for select
using (user_id = auth.uid());

create policy "items_insert_own"
on public.latch_items for insert
with check (user_id = auth.uid());

create policy "items_update_own"
on public.latch_items for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "items_delete_own"
on public.latch_items for delete
using (user_id = auth.uid());

create policy "proofs_select_own"
on public.item_proofs for select
using (user_id = auth.uid());

create policy "proofs_insert_own"
on public.item_proofs for insert
with check (user_id = auth.uid());

create policy "proofs_delete_own"
on public.item_proofs for delete
using (user_id = auth.uid());

-- Audit logs
create table if not exists public.latch_audit_log (
  id uuid primary key default gen_random_uuid(),
  latch_id uuid not null references public.latches(id) on delete cascade,
  item_id uuid not null references public.latch_items(id) on delete cascade,
  user_id uuid not null,
  action_type text not null, -- 'create', 'update_phase', 'toggle_proof'
  old_phase text,
  new_phase text,
  proof_url text,
  created_at timestamptz not null default now()
);

alter table public.latch_audit_log enable row level security;

create policy "audit_select_own"
on public.latch_audit_log for select
using (user_id = auth.uid());

-- Phase advancement RPC
create or replace function public.advance_item_phase(p_item_id uuid, p_next public.latch_phase)
returns public.latch_items
language plpgsql
security definer
as $$
declare
  v_item public.latch_items;
  v_proof_count int;
  v_latest_proof_url text;
  v_old_phase public.latch_phase;
begin
  select * into v_item
  from public.latch_items
  where id = p_item_id;

  if v_item.user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;

  v_old_phase := v_item.phase;

  if p_next in ('ready','locked') and v_item.proof_required then
    select count(*) into v_proof_count
    from public.item_proofs
    where item_id = v_item.id and user_id = auth.uid();

    if v_proof_count < 1 then
      raise exception 'proof required';
    end if;

    -- Get latest proof URL for audit log
    select url into v_latest_proof_url
    from public.item_proofs
    where item_id = v_item.id and user_id = auth.uid()
    order by created_at desc
    limit 1;
  end if;

  update public.latch_items
  set phase = p_next
  where id = v_item.id
  returning * into v_item;

  -- Log the change to audit log
  insert into public.latch_audit_log (latch_id, item_id, user_id, action_type, old_phase, new_phase, proof_url)
  values (v_item.latch_id, v_item.id, auth.uid(), 'update_phase', v_old_phase::text, p_next::text, v_latest_proof_url);

  return v_item;
end $$;

revoke all on function public.advance_item_phase(uuid, public.latch_phase) from public;
grant execute on function public.advance_item_phase(uuid, public.latch_phase) to authenticated;

create extension if not exists pgcrypto;

create table if not exists ncp_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists ncp_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references ncp_users(id) on delete cascade,
  title text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  published_slug text null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists ncp_cards (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references ncp_pages(id) on delete cascade,
  type text not null check (type in ('text','image','embed','quote')),
  ord int not null,
  title text not null default '',
  body text not null default '',
  image_url text not null default '',
  embed_url text not null default '',
  created_at timestamptz not null default now(),
  unique(page_id, ord)
);

create index if not exists idx_ncp_pages_user_status on ncp_pages(user_id, status, updated_at desc);
create index if not exists idx_ncp_cards_page_ord on ncp_cards(page_id, ord);

insert into ncp_users (id, device_key, created_at)
select distinct p.user_id, 'migrated-' || p.user_id::text, now()
from ncp_pages p
left join ncp_users u on u.id = p.user_id
where u.id is null
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'ncp_pages'::regclass
      and contype = 'f'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'ncp_pages'::regclass and attname = 'user_id')
      ]
  loop
    execute format('alter table ncp_pages drop constraint %I', c.conname);
  end loop;
end $$;

alter table ncp_pages
  add constraint ncp_pages_user_id_fkey
  foreign key (user_id) references ncp_users(id) on delete cascade;

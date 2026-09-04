create extension if not exists "pgcrypto";

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled board',
  owner_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  thumbnail_url text
);

create table if not exists board_members (
  board_id uuid not null references boards (id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- Element ids are generated client-side with nanoid(), not Postgres —
-- must be `text`, not `uuid`, or every insert/upsert from the app fails.
create table if not exists board_elements (
  id text primary key,
  board_id uuid not null references boards (id) on delete cascade,
  type text not null check (type in ('path', 'rectangle', 'ellipse', 'arrow', 'line', 'text')),
  data jsonb not null,
  created_by text not null,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_elements_board_id_idx on board_elements (board_id);
create index if not exists board_members_user_id_idx on board_members (user_id);

-- Keep boards.updated_at fresh whenever an element changes, so board lists
-- can sort by "recently active" without a separate write.
create or replace function touch_board_updated_at() returns trigger as $$
begin
  update boards set updated_at = now() where id = new.board_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists board_elements_touch_board on board_elements;
create trigger board_elements_touch_board
  after insert or update on board_elements
  for each row execute function touch_board_updated_at();

-- Row Level Security: requests come through server Route Handlers using the
-- service role key (which bypasses RLS) after Clerk auth + membership checks
-- in application code. RLS is enabled anyway as defense in depth in case the
-- anon key is ever used directly from the client.
alter table boards enable row level security;
alter table board_members enable row level security;
alter table board_elements enable row level security;

create policy "service role full access boards" on boards
  for all using (auth.role() = 'service_role');
create policy "service role full access members" on board_members
  for all using (auth.role() = 'service_role');
create policy "service role full access elements" on board_elements
  for all using (auth.role() = 'service_role');
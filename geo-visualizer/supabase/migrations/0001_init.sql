create table if not exists geo_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_count int not null,
  query_count int not null,
  mock_embeddings boolean not null,
  model text not null,
  pages jsonb not null,
  queries jsonb not null,
  points jsonb not null,
  gaps jsonb not null
);

create index if not exists geo_runs_created_at_idx on geo_runs (created_at desc);

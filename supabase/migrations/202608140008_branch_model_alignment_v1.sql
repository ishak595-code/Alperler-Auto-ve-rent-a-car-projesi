alter table public.branches
  add column map_url text,
  add column is_pickup_point boolean not null default true,
  add column is_return_point boolean not null default true;
create index branches_pickup_active_idx on public.branches (is_active, is_pickup_point, sort_order) where is_pickup_point = true;
create index branches_return_active_idx on public.branches (is_active, is_return_point, sort_order) where is_return_point = true;

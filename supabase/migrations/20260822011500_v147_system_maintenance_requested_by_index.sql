create index if not exists system_maintenance_runs_requested_by_idx
  on public.system_maintenance_runs (requested_by)
  where requested_by is not null;

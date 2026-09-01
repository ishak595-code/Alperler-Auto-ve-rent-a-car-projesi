create index if not exists notification_templates_updated_by_idx
  on public.notification_templates (updated_by)
  where updated_by is not null;

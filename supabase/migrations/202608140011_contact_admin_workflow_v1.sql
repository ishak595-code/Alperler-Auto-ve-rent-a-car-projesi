alter table public.contact_messages
  add column internal_notes text,
  add column assigned_to uuid references auth.users(id) on delete set null;
create index contact_messages_assigned_idx on public.contact_messages (assigned_to) where assigned_to is not null;

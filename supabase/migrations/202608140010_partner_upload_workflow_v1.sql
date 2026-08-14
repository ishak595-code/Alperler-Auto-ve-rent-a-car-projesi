alter table public.partner_requests drop constraint if exists partner_requests_status_check;
alter table public.partner_requests add constraint partner_requests_status_check check (status in ('UPLOADING','NEW','REVIEWING','CONTACTED','OFFERED','ACCEPTED','REJECTED','CLOSED'));

alter table public.notification_deliveries add column partner_request_id uuid references public.partner_requests(id) on delete cascade;
alter table public.notification_deliveries drop constraint if exists notification_parent_chk;
alter table public.notification_deliveries add constraint notification_parent_chk check (booking_id is not null or contact_message_id is not null or partner_request_id is not null);
drop index if exists public.notification_event_channel_uidx;
create unique index notification_event_channel_uidx on public.notification_deliveries (
  coalesce(booking_id::text,''),
  coalesce(contact_message_id::text,''),
  coalesce(partner_request_id::text,''),
  event_key,
  channel
);
create index notification_partner_request_idx on public.notification_deliveries (partner_request_id) where partner_request_id is not null;

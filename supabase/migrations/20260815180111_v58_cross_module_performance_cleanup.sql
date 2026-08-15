create index if not exists newsletter_campaigns_created_by_idx on public.newsletter_campaigns(created_by) where created_by is not null;
create index if not exists newsletter_deliveries_subscriber_idx on public.newsletter_deliveries(subscriber_id) where subscriber_id is not null;
drop index if exists public.subscribers_email_normalized_unique;

alter table public.contact_messages add column idempotency_key text unique;
create index contact_messages_email_created_idx on public.contact_messages (lower(email), created_at desc);

alter table public.partner_requests
  add column idempotency_key text unique,
  add column intent text check (intent in ('SELL','RENT')),
  add column with_driver boolean not null default false,
  add column upload_token_hash text,
  add column submitted_at timestamptz;
create index partner_requests_contact_created_idx on public.partner_requests (customer_phone, created_at desc);

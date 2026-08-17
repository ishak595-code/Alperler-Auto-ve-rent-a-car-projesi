-- V90: auditable newsletter subscribe/unsubscribe events.
create table if not exists public.newsletter_consent_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers(id) on delete cascade,
  email text not null,
  event_type text not null check (event_type in ('SUBSCRIBE','UNSUBSCRIBE')),
  channel text not null default 'EMAIL' check (channel in ('EMAIL')),
  source text not null default 'WEB',
  text_version text not null default 'web-newsletter-v1',
  created_at timestamptz not null default now()
);

alter table public.newsletter_consent_events enable row level security;
drop policy if exists newsletter_consent_events_admin_read on public.newsletter_consent_events;
create policy newsletter_consent_events_admin_read
on public.newsletter_consent_events for select to authenticated
using (private.can_manage_operations());

create index if not exists newsletter_consent_events_email_created_idx
on public.newsletter_consent_events(email, created_at desc);

create or replace function private.record_newsletter_consent_event()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.newsletter_consent_events(subscriber_id,email,event_type,channel,source,text_version)
    values (new.id,new.email,'SUBSCRIBE','EMAIL',coalesce(new.source,'WEB'),'web-newsletter-v1');
  elsif new.status = 'UNSUBSCRIBED' and old.status is distinct from new.status then
    insert into public.newsletter_consent_events(subscriber_id,email,event_type,channel,source,text_version)
    values (new.id,new.email,'UNSUBSCRIBE','EMAIL',coalesce(new.source,'WEB'),'web-newsletter-v1');
  elsif new.status = 'ACTIVE' and new.consent_at is distinct from old.consent_at then
    insert into public.newsletter_consent_events(subscriber_id,email,event_type,channel,source,text_version)
    values (new.id,new.email,'SUBSCRIBE','EMAIL',coalesce(new.source,'WEB'),'web-newsletter-v1');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_newsletter_consent_event on public.subscribers;
create trigger trg_newsletter_consent_event
after insert or update of status, consent_at on public.subscribers
for each row execute function private.record_newsletter_consent_event();

revoke all on table public.customer_payment_methods from anon;
revoke insert, update, delete, truncate, trigger, references on table public.customer_payment_methods from authenticated;
grant select on table public.customer_payment_methods to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.customer_payment_methods'::regclass and conname='customer_payment_methods_provider_check'
  ) then
    alter table public.customer_payment_methods
      add constraint customer_payment_methods_provider_check check (provider = any (array['PAYTR','IYZICO']));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid='private.customer_payment_tokens'::regclass and conname='customer_payment_tokens_provider_check'
  ) then
    alter table private.customer_payment_tokens
      add constraint customer_payment_tokens_provider_check check (provider = any (array['PAYTR','IYZICO']));
  end if;
end $$;

create unique index if not exists customer_payment_tokens_provider_ref_uidx
  on private.customer_payment_tokens(user_id,provider,provider_payment_method_ref)
  where provider_payment_method_ref is not null;

create index if not exists customer_payment_methods_active_user_idx
  on public.customer_payment_methods(user_id,is_default desc,created_at desc)
  where status='ACTIVE';

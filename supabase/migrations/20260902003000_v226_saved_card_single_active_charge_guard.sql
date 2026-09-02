begin;

create unique index if not exists uq_payment_transactions_one_active_saved_card_v226
  on public.payment_transactions (booking_id)
  where status in ('CREATED','PENDING','AUTHORIZED','PAID')
    and request_snapshot ->> 'storedCard' = 'true';

comment on index public.uq_payment_transactions_one_active_saved_card_v226 is
  'V226: prevents concurrent active stored-card charges for the same booking, even when different saved cards are selected.';

commit;

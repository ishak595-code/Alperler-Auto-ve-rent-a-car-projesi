create or replace function private.sync_saved_card_payer_identity_v225()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  b public.bookings%rowtype;
begin
  if new.status not in ('PAID','AUTHORIZED') then return new; end if;
  if coalesce(new.request_snapshot->>'storedCard','false') <> 'true' then return new; end if;
  if tg_op='UPDATE' and old.status in ('PAID','AUTHORIZED') then return new; end if;

  select * into b from public.bookings where id=new.booking_id and deleted_at is null;
  if not found or b.customer_user_id is null then return new; end if;

  insert into private.booking_party_checks(
    booking_id,booking_customer_user_id,payer_account_user_id,payer_match_status,
    payer_verified_at,payer_verified_by,metadata,updated_at
  ) values(
    b.id,b.customer_user_id,b.customer_user_id,'ACCOUNT_MATCHED',now(),b.customer_user_id,
    jsonb_build_object('channel','CARD','scope','SAVED_CARD_SERVER_VERIFIED','paymentTransactionId',new.id),now()
  )
  on conflict(booking_id) do update set
    booking_customer_user_id=excluded.booking_customer_user_id,
    payer_account_user_id=excluded.payer_account_user_id,
    payer_match_status='ACCOUNT_MATCHED',
    payer_verified_at=now(),payer_verified_by=excluded.payer_verified_by,
    metadata=private.booking_party_checks.metadata||excluded.metadata,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists payment_transactions_saved_card_payer_v225 on public.payment_transactions;
create trigger payment_transactions_saved_card_payer_v225
after insert or update of status on public.payment_transactions
for each row execute function private.sync_saved_card_payer_identity_v225();

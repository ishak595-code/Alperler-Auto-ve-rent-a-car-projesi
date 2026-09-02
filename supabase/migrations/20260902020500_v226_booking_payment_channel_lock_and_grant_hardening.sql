-- V226: one active customer payment attempt per booking, regardless of card channel.
-- This closes the cross-channel race between hosted iyzico/PayTR sessions and
-- direct provider-tokenized saved-card charges. Failed/cancelled/refunded rows
-- leave the partial index, so legitimate retries remain possible.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_transactions
    WHERE status IN ('CREATED','PENDING','AUTHORIZED','PAID')
    GROUP BY booking_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce V226 booking payment lock: duplicate active payment attempts exist';
  END IF;
END
$$;

drop index if exists public.uq_payment_transactions_one_active_saved_card_v226;

create unique index if not exists uq_payment_transactions_one_active_booking_v226
  on public.payment_transactions(booking_id)
  where status in ('CREATED','PENDING','AUTHORIZED','PAID');

-- Browser clients never write payment ledger rows. Payment mutations are owned
-- by server-side gateways using the service role. Authenticated finance/admin
-- readers retain SELECT, constrained by the existing RLS policy.
revoke all on table public.payment_transactions from anon;
revoke insert, update, delete on table public.payment_transactions from authenticated;
grant select on table public.payment_transactions to authenticated;

create table if not exists private.customer_payment_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  iyzico_sandbox_card_user_key text,
  iyzico_live_card_user_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.customer_payment_wallets from public, anon, authenticated;
grant select, insert, update, delete on table private.customer_payment_wallets to service_role;

create or replace function public.service_customer_card_user_key_v225(p_user_id uuid, p_test_mode boolean)
returns text
language sql
security definer
set search_path = pg_catalog, private
as $$
  select case when p_test_mode then w.iyzico_sandbox_card_user_key else w.iyzico_live_card_user_key end
  from private.customer_payment_wallets w
  where w.user_id = p_user_id
  limit 1
$$;

create or replace function public.service_set_customer_card_user_key_v225(p_user_id uuid, p_test_mode boolean, p_card_user_key text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  clean_key text := nullif(btrim(coalesce(p_card_user_key,'')), '');
begin
  if p_user_id is null or clean_key is null or length(clean_key) > 500 then
    raise exception 'INVALID_CARD_WALLET_KEY';
  end if;

  insert into private.customer_payment_wallets(user_id, iyzico_sandbox_card_user_key, iyzico_live_card_user_key)
  values(p_user_id, case when p_test_mode then clean_key end, case when not p_test_mode then clean_key end)
  on conflict (user_id) do update
  set iyzico_sandbox_card_user_key = case when p_test_mode then excluded.iyzico_sandbox_card_user_key else private.customer_payment_wallets.iyzico_sandbox_card_user_key end,
      iyzico_live_card_user_key = case when not p_test_mode then excluded.iyzico_live_card_user_key else private.customer_payment_wallets.iyzico_live_card_user_key end,
      updated_at = now();

  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.service_customer_card_user_key_v225(uuid,boolean) from public, anon, authenticated;
revoke all on function public.service_set_customer_card_user_key_v225(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.service_customer_card_user_key_v225(uuid,boolean) to service_role;
grant execute on function public.service_set_customer_card_user_key_v225(uuid,boolean,text) to service_role;

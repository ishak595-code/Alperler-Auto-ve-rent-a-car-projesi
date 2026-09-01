drop function if exists public.service_record_offline_payment_v221(uuid,text,numeric,text,text,text);

create or replace function public.service_record_offline_payment_v221(
  p_actor uuid,
  p_booking_reference text,
  p_amount numeric,
  p_method text,
  p_external_reference text,
  p_note text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $$
declare
  b public.bookings%rowtype;
  tx public.payment_transactions%rowtype;
  finance_row public.finance_transactions%rowtype;
  actor_email text;
  method text := upper(btrim(coalesce(p_method,'')));
  ext text;
  idem text;
  due numeric;
begin
  select a.email into actor_email from public.admin_users a
   where a.user_id=p_actor and a.is_active=true
     and (lower(a.role) in ('owner','admin') or coalesce(a.permissions->>'finance.manage','false')='true')
   limit 1;
  if actor_email is null then raise exception 'FINANCE_ADMIN_REQUIRED'; end if;
  if method <> all(array['OFFICE','EFT']) then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;

  select * into b from public.bookings
   where reference=btrim(coalesce(p_booking_reference,'')) and deleted_at is null
   for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.status in ('REJECTED','CANCELLED') then raise exception 'BOOKING_NOT_PAYABLE'; end if;
  if coalesce(b.total_price,0) <= 0 then raise exception 'BOOKING_TOTAL_REQUIRED'; end if;

  due := greatest(b.total_price - coalesce(b.amount_paid,0),0);
  if due <= 0.009 then raise exception 'PAYMENT_ALREADY_SETTLED'; end if;
  if p_amount > due + 0.01 then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;

  idem := 'offline:' || p_actor::text || ':' || btrim(p_idempotency_key);
  select * into tx from public.payment_transactions where idempotency_key=idem limit 1;
  if found then
    if tx.booking_id <> b.id or abs(tx.amount-p_amount) > 0.01 or lower(tx.provider) <> lower(method) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    select * into finance_row from public.finance_transactions where payment_transaction_id=tx.id and status<>'VOID' limit 1;
    return jsonb_build_object('ok',true,'duplicate',true,'payment',to_jsonb(tx),'finance',to_jsonb(finance_row),'booking',jsonb_build_object('id',b.id,'reference',b.reference,'amountPaid',b.amount_paid,'paymentStatus',b.payment_status));
  end if;

  ext := nullif(btrim(coalesce(p_external_reference,'')),'');
  if ext is null then ext := method || '-' || b.reference || '-' || substr(replace(btrim(p_idempotency_key),'-',''),1,16); end if;

  if exists(select 1 from public.payment_transactions p where p.provider=lower(method) and p.provider_reference=ext) then
    raise exception 'PAYMENT_REFERENCE_CONFLICT';
  end if;

  insert into public.payment_transactions(
    booking_id,provider,provider_reference,idempotency_key,amount,currency,status,request_snapshot,response_snapshot
  ) values(
    b.id,lower(method),ext,idem,round(p_amount,2),b.currency,'PAID',
    jsonb_build_object('recordedByActor',p_actor,'recordedByEmail',actor_email,'method',method,'note',nullif(btrim(coalesce(p_note,'')),'')),
    jsonb_build_object('source','ADMIN_CONFIRMED','recordedAt',now())
  ) returning * into tx;

  select * into b from public.bookings where id=b.id;
  select * into finance_row from public.finance_transactions where payment_transaction_id=tx.id and status<>'VOID' limit 1;
  return jsonb_build_object('ok',true,'duplicate',false,'payment',to_jsonb(tx),'finance',to_jsonb(finance_row),'booking',jsonb_build_object('id',b.id,'reference',b.reference,'amountPaid',b.amount_paid,'paymentStatus',b.payment_status));
end;
$$;
revoke all on function public.service_record_offline_payment_v221(uuid,text,numeric,text,text,text,text) from public, anon, authenticated;
grant execute on function public.service_record_offline_payment_v221(uuid,text,numeric,text,text,text,text) to service_role;

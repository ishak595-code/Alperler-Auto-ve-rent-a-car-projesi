create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  audience text not null default 'CUSTOMER',
  locale text not null default 'tr',
  subject_template text not null,
  intro_template text not null,
  next_step_template text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_event_check check (event_key = any (array['booking_created','booking_pending','booking_approved','booking_rejected','booking_completed','booking_cancelled','payment_received'])),
  constraint notification_templates_audience_check check (audience = any (array['CUSTOMER','ADMIN'])),
  constraint notification_templates_locale_check check (locale = any (array['tr','en','de','fr'])),
  constraint notification_templates_subject_len check (char_length(subject_template) between 3 and 240),
  constraint notification_templates_intro_len check (char_length(intro_template) between 3 and 3000),
  constraint notification_templates_next_len check (char_length(next_step_template) between 3 and 3000),
  constraint notification_templates_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint notification_templates_unique unique (event_key, audience, locale)
);

alter table public.notification_templates enable row level security;
revoke all on table public.notification_templates from anon, authenticated;
grant select, insert, update, delete on table public.notification_templates to service_role;

drop trigger if exists notification_templates_touch on public.notification_templates;
create trigger notification_templates_touch
before update on public.notification_templates
for each row execute function private.touch_updated_at();

insert into public.notification_templates(event_key,audience,locale,subject_template,intro_template,next_step_template,metadata)
values
('booking_created','CUSTOMER','tr','Rezervasyon talebiniz alındı | {{reference}}','Merhaba {{customer_name}}, {{item_name}} için talebinizi aldık. {{reference}} referans numarasıyla güvenli biçimde kaydettik.','Ekibimiz uygunluk ve operasyon ayrıntılarını kontrol edecek. Referans numaranızı saklayın; kesinleşen bilgileri size ayrıca bildireceğiz.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','tr','Rezervasyonunuz kontrol ediliyor | {{reference}}','Merhaba {{customer_name}}, {{reference}} numaralı rezervasyonunuz aktif olarak inceleniyor.','Araç, tur, tarih ve teslim ayrıntıları kesinleştiğinde size bilgi vereceğiz.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','tr','Rezervasyonunuz onaylandı | {{reference}}','Merhaba {{customer_name}}, güzel haber: {{item_name}} için {{reference}} numaralı rezervasyonunuz onaylandı.','Teslim veya buluşma ayrıntıları ile kalan ödeme adımlarını bu referans üzerinden takip edebilirsiniz.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','tr','Rezervasyon talebinizle ilgili güncelleme | {{reference}}','Merhaba {{customer_name}}, {{reference}} numaralı talebiniz mevcut koşullarda onaylanamadı.','Uygun farklı araç, tarih veya hizmet seçenekleri için ekibimizle iletişime geçebilirsiniz.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','tr','İşleminiz tamamlandı | {{reference}}','Merhaba {{customer_name}}, {{reference}} numaralı işleminiz tamamlandı.','Alperler Auto’yu tercih ettiğiniz için teşekkür ederiz. Yeni bir araç, transfer veya tur ihtiyacınızda yine yanınızdayız.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','tr','Rezervasyonunuz iptal edildi | {{reference}}','Merhaba {{customer_name}}, {{reference}} numaralı rezervasyonunuz iptal edildi.','Yeni tarih veya farklı bir seçenek isterseniz yeni talep oluşturabilir ya da ekibimizle iletişime geçebilirsiniz.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','tr','Ödemeniz alındı | {{reference}}','Merhaba {{customer_name}}, {{reference}} numaralı rezervasyonunuz için {{payment_amount}} tutarındaki ödemenizi aldık.','Ödemeniz güvenli biçimde kaydedildi. Güncel ödenen tutar {{amount_paid}}, kalan tutar {{balance_due}}. Bu e-posta ödeme onayınızdır.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','en','We received your reservation request | {{reference}}','Hello {{customer_name}}, we received your request for {{item_name}} and recorded it securely under reference {{reference}}.','Our team will verify availability and operational details. Keep your reference number; we will send confirmed details separately.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','en','Your reservation is being reviewed | {{reference}}','Hello {{customer_name}}, your reservation {{reference}} is currently being reviewed.','We will update you once vehicle, tour, timing and handover details are confirmed.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','en','Your reservation is approved | {{reference}}','Hello {{customer_name}}, good news: your reservation {{reference}} for {{item_name}} is approved.','You can follow handover or meeting details and any remaining payment step using this reference.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','en','Update about your reservation request | {{reference}}','Hello {{customer_name}}, your request {{reference}} could not be approved under the current conditions.','Contact our team for another vehicle, date or service option.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','en','Your transaction is completed | {{reference}}','Hello {{customer_name}}, your transaction {{reference}} is completed.','Thank you for choosing Alperler Auto. We will be happy to help with your next vehicle, transfer or tour.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','en','Your reservation is cancelled | {{reference}}','Hello {{customer_name}}, your reservation {{reference}} has been cancelled.','You can create a new request or contact our team for a new date or another option.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','en','We received your payment | {{reference}}','Hello {{customer_name}}, we received your {{payment_amount}} payment for reservation {{reference}}.','Your payment is securely recorded. Paid to date: {{amount_paid}}. Remaining balance: {{balance_due}}. This email is your payment confirmation.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','de','Ihre Reservierungsanfrage ist eingegangen | {{reference}}','Hallo {{customer_name}}, wir haben Ihre Anfrage für {{item_name}} unter der Referenz {{reference}} sicher gespeichert.','Unser Team prüft Verfügbarkeit und operative Details. Bewahren Sie Ihre Referenznummer auf; bestätigte Informationen senden wir separat.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','de','Ihre Reservierung wird geprüft | {{reference}}','Hallo {{customer_name}}, Ihre Reservierung {{reference}} wird derzeit geprüft.','Sobald Fahrzeug, Tour, Termin und Übergabe bestätigt sind, informieren wir Sie.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','de','Ihre Reservierung ist bestätigt | {{reference}}','Hallo {{customer_name}}, gute Nachricht: Ihre Reservierung {{reference}} für {{item_name}} ist bestätigt.','Übergabe- oder Treffpunktdetails sowie offene Zahlungsschritte können Sie über diese Referenz verfolgen.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','de','Aktualisierung zu Ihrer Reservierungsanfrage | {{reference}}','Hallo {{customer_name}}, Ihre Anfrage {{reference}} konnte unter den aktuellen Bedingungen nicht bestätigt werden.','Kontaktieren Sie unser Team für ein anderes Fahrzeug, Datum oder eine andere Leistung.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','de','Ihr Vorgang ist abgeschlossen | {{reference}}','Hallo {{customer_name}}, Ihr Vorgang {{reference}} ist abgeschlossen.','Vielen Dank, dass Sie Alperler Auto gewählt haben. Wir helfen Ihnen gerne auch beim nächsten Fahrzeug, Transfer oder Ausflug.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','de','Ihre Reservierung wurde storniert | {{reference}}','Hallo {{customer_name}}, Ihre Reservierung {{reference}} wurde storniert.','Sie können eine neue Anfrage erstellen oder unser Team wegen eines neuen Termins oder einer Alternative kontaktieren.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','de','Ihre Zahlung ist eingegangen | {{reference}}','Hallo {{customer_name}}, wir haben Ihre Zahlung über {{payment_amount}} für die Reservierung {{reference}} erhalten.','Ihre Zahlung wurde sicher erfasst. Bisher bezahlt: {{amount_paid}}. Restbetrag: {{balance_due}}. Diese E-Mail ist Ihre Zahlungsbestätigung.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','fr','Votre demande de réservation a bien été reçue | {{reference}}','Bonjour {{customer_name}}, nous avons reçu votre demande pour {{item_name}} et l’avons enregistrée sous la référence {{reference}}.','Notre équipe vérifie la disponibilité et les détails opérationnels. Conservez votre référence; les informations confirmées vous seront envoyées séparément.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','fr','Votre réservation est en cours de vérification | {{reference}}','Bonjour {{customer_name}}, votre réservation {{reference}} est en cours de vérification.','Nous vous informerons dès que le véhicule, le circuit, l’horaire et la remise seront confirmés.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','fr','Votre réservation est confirmée | {{reference}}','Bonjour {{customer_name}}, bonne nouvelle: votre réservation {{reference}} pour {{item_name}} est confirmée.','Vous pouvez suivre les détails de remise ou de rendez-vous ainsi que toute étape de paiement restante avec cette référence.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','fr','Mise à jour de votre demande de réservation | {{reference}}','Bonjour {{customer_name}}, votre demande {{reference}} n’a pas pu être confirmée dans les conditions actuelles.','Contactez notre équipe pour un autre véhicule, une autre date ou un autre service.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','fr','Votre opération est terminée | {{reference}}','Bonjour {{customer_name}}, votre opération {{reference}} est terminée.','Merci d’avoir choisi Alperler Auto. Nous serons heureux de vous aider pour votre prochain véhicule, transfert ou circuit.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','fr','Votre réservation a été annulée | {{reference}}','Bonjour {{customer_name}}, votre réservation {{reference}} a été annulée.','Vous pouvez créer une nouvelle demande ou contacter notre équipe pour une nouvelle date ou une autre option.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','fr','Votre paiement a bien été reçu | {{reference}}','Bonjour {{customer_name}}, nous avons reçu votre paiement de {{payment_amount}} pour la réservation {{reference}}.','Votre paiement est enregistré en toute sécurité. Total payé: {{amount_paid}}. Solde restant: {{balance_due}}. Cet e-mail est votre confirmation de paiement.','{"version":1}'::jsonb)
on conflict (event_key,audience,locale) do nothing;

create or replace function public.service_save_notification_template_v221(
  p_actor uuid,
  p_id uuid,
  p_event_key text,
  p_locale text,
  p_subject text,
  p_intro text,
  p_next_step text,
  p_is_active boolean
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $$
declare
  v_row public.notification_templates%rowtype;
  v_event text := lower(btrim(coalesce(p_event_key,'')));
  v_locale text := lower(btrim(coalesce(p_locale,'')));
begin
  if not exists (
    select 1 from public.admin_users a
    where a.user_id = p_actor and a.is_active = true
      and (lower(a.role) in ('owner','admin') or coalesce(a.permissions->>'finance.manage','false') = 'true')
  ) then raise exception 'FINANCE_ADMIN_REQUIRED'; end if;
  if v_event <> all(array['booking_created','booking_pending','booking_approved','booking_rejected','booking_completed','booking_cancelled','payment_received']) then raise exception 'INVALID_NOTIFICATION_EVENT'; end if;
  if v_locale <> all(array['tr','en','de','fr']) then raise exception 'INVALID_NOTIFICATION_LOCALE'; end if;
  if char_length(btrim(coalesce(p_subject,''))) not between 3 and 240 then raise exception 'INVALID_NOTIFICATION_SUBJECT'; end if;
  if char_length(btrim(coalesce(p_intro,''))) not between 3 and 3000 then raise exception 'INVALID_NOTIFICATION_INTRO'; end if;
  if char_length(btrim(coalesce(p_next_step,''))) not between 3 and 3000 then raise exception 'INVALID_NOTIFICATION_NEXT_STEP'; end if;

  if p_id is not null then
    update public.notification_templates
       set event_key=v_event, locale=v_locale, audience='CUSTOMER',
           subject_template=btrim(p_subject), intro_template=btrim(p_intro), next_step_template=btrim(p_next_step),
           is_active=coalesce(p_is_active,true), updated_by=p_actor
     where id=p_id and audience='CUSTOMER'
     returning * into v_row;
    if not found then raise exception 'NOTIFICATION_TEMPLATE_NOT_FOUND'; end if;
  else
    insert into public.notification_templates(event_key,audience,locale,subject_template,intro_template,next_step_template,is_active,updated_by)
    values(v_event,'CUSTOMER',v_locale,btrim(p_subject),btrim(p_intro),btrim(p_next_step),coalesce(p_is_active,true),p_actor)
    on conflict(event_key,audience,locale) do update
      set subject_template=excluded.subject_template,
          intro_template=excluded.intro_template,
          next_step_template=excluded.next_step_template,
          is_active=excluded.is_active,
          updated_by=excluded.updated_by
    returning * into v_row;
  end if;
  return jsonb_build_object('ok',true,'template',to_jsonb(v_row));
end;
$$;
revoke all on function public.service_save_notification_template_v221(uuid,uuid,text,text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.service_save_notification_template_v221(uuid,uuid,text,text,text,text,text,boolean) to service_role;

alter table public.finance_transactions drop constraint if exists finance_transactions_source_check;
alter table public.finance_transactions add constraint finance_transactions_source_check
  check (source = any (array['AUTOMATIC','PAYTR','IYZICO','EFT','OFFICE','IMPORT','MANUAL']));

create or replace function private.sync_paid_payment_to_finance()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  b public.bookings%rowtype;
  finance_category text;
  finance_source text;
  actual_method text;
  paid_total numeric := 0;
  actor_id uuid := null;
begin
  if new.status <> 'PAID' or (tg_op='UPDATE' and old.status='PAID') then return new; end if;
  select * into b from public.bookings where id=new.booking_id;
  if not found then return new; end if;

  finance_category := case b.booking_type when 'RENTAL' then 'RENTAL' when 'TOUR' then 'TOUR' when 'SALE_INQUIRY' then 'VEHICLE_SALE' else 'SERVICE' end;
  finance_source := case lower(coalesce(new.provider,'')) when 'paytr' then 'PAYTR' when 'iyzico' then 'IYZICO' when 'office' then 'OFFICE' when 'eft' then 'EFT' else 'AUTOMATIC' end;
  actual_method := case lower(coalesce(new.provider,'')) when 'office' then 'OFFICE' when 'eft' then 'EFT' else coalesce(b.payment_method,'CARD') end;
  begin actor_id := nullif(new.request_snapshot->>'recordedByActor','')::uuid; exception when others then actor_id := null; end;

  insert into public.finance_transactions(
    direction,category,booking_id,payment_transaction_id,vehicle_id,tour_id,campaign_id,payment_method,
    gross_amount,discount_amount,tax_amount,net_amount,currency,counterparty_name,reference,description,
    source,external_reference,status,metadata,created_by
  ) values(
    'INCOME',finance_category,b.id,new.id,b.vehicle_id,b.tour_id,b.campaign_id,actual_method,
    new.amount,0,0,new.amount,new.currency,b.customer_name,b.reference,b.item_name,
    finance_source,new.provider_reference,'POSTED',jsonb_build_object('booking_type',b.booking_type,'provider',new.provider,'commercial_discount_snapshot',coalesce(b.discount_amount,0)),actor_id
  ) on conflict do nothing;

  select coalesce(sum(pt.amount),0) into paid_total
    from public.payment_transactions pt where pt.booking_id=b.id and pt.status='PAID';
  update public.bookings
     set amount_paid=paid_total,
         payment_recorded_at=now(),
         payment_status=case
           when coalesce(total_price,0) > 0 and paid_total >= greatest(total_price - 0.01,0) then 'PAID'
           when paid_total > 0 then 'PENDING'
           else payment_status
         end,
         updated_at=now()
   where id=b.id;
  return new;
end;
$$;

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

create or replace function public.service_admin_operations_snapshot_v178(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $$
begin
  if not (private.can_actor_manage_operations(p_actor) or private.can_actor_manage_settings_v174(p_actor)) then
    raise exception 'ADMIN_OPERATIONS_REQUIRED';
  end if;

  return jsonb_build_object(
    'ok', true,
    'bookings', (select count(*) from public.bookings b where b.deleted_at is null),
    'pendingBookings', (select count(*) from public.bookings b where b.deleted_at is null and b.status='PENDING'),
    'todayBookings', (select count(*) from public.bookings b where b.deleted_at is null and (b.created_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),
    'todayStarts', (select count(*) from public.bookings b where b.deleted_at is null and b.status not in ('REJECTED','CANCELLED') and b.start_at is not null and (b.start_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),
    'todayEnds', (select count(*) from public.bookings b where b.deleted_at is null and b.status not in ('REJECTED','CANCELLED') and b.end_at is not null and (b.end_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),
    'officePaymentsDue', (select count(*) from public.bookings b where b.deleted_at is null and b.status not in ('REJECTED','CANCELLED') and b.payment_method='OFFICE' and greatest(coalesce(b.total_price,0)-coalesce(b.amount_paid,0),0)>0.009),
    'eftPaymentsDue', (select count(*) from public.bookings b where b.deleted_at is null and b.status not in ('REJECTED','CANCELLED') and b.payment_method='EFT' and greatest(coalesce(b.total_price,0)-coalesce(b.amount_paid,0),0)>0.009),
    'appointments', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type='APPOINTMENT'),
    'saleInquiries', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type='SALE_INQUIRY'),
    'tourBookings', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type='TOUR'),
    'openMessages', (select count(*) from public.contact_messages m where m.status in ('NEW','READ')),
    'openPartnerRequests', (select count(*) from public.partner_requests r where r.status in ('NEW','UPLOADING','REVIEWING')),
    'activeSubscribers', (select count(*) from public.subscribers s where s.status='ACTIVE'),
    'activeStaff', (select count(*) from public.staff_profiles s where s.is_active=true),
    'failedNotifications', (select count(*) from public.notification_deliveries n where n.status='FAILED'),
    'revenue', coalesce((select sum(f.net_amount) from public.finance_transactions f where f.status='POSTED' and f.direction='INCOME'),0),
    'upcoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'reference',q.reference,'bookingType',q.booking_type,'itemName',q.item_name,'customerName',q.customer_name,
        'startAt',q.start_at,'endAt',q.end_at,'status',q.status,'paymentMethod',q.payment_method,'paymentStatus',q.payment_status,
        'amountDue',greatest(coalesce(q.total_price,0)-coalesce(q.amount_paid,0),0),'currency',q.currency
      ) order by q.start_at asc)
      from (
        select b.id,b.reference,b.booking_type,b.item_name,b.customer_name,b.start_at,b.end_at,b.status,b.payment_method,b.payment_status,b.total_price,b.amount_paid,b.currency
        from public.bookings b
        where b.deleted_at is null and b.status not in ('REJECTED','CANCELLED') and b.start_at is not null
          and b.start_at >= now() and b.start_at < now()+interval '7 days'
        order by b.start_at asc limit 20
      ) q
    ),'[]'::jsonb),
    'recentAudit', coalesce((
      select jsonb_agg(jsonb_build_object('id',q.id,'action',q.action,'entityType',q.entity_type,'entityId',q.entity_id,'actorEmail',q.actor_email,'createdAt',q.created_at) order by q.created_at desc)
      from (select a.id,a.action,a.entity_type,a.entity_id,a.actor_email,a.created_at from public.audit_logs a order by a.created_at desc limit 12) q
    ),'[]'::jsonb)
  );
end;
$$;

alter table public.customer_referrals
  add column if not exists source_campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists landing_path text;

create index if not exists idx_customer_referrals_source_campaign_id
  on public.customer_referrals(source_campaign_id)
  where source_campaign_id is not null;

create or replace function public.claim_customer_referral_context(
  p_code text,
  p_campaign_id uuid default null,
  p_landing_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_inviter uuid;
  v_existing public.customer_referrals;
  v_created_at timestamptz;
  v_campaign_id uuid;
  v_landing_path text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_code is null or upper(trim(p_code)) !~ '^[A-Z0-9]{8,16}$' then raise exception 'INVALID_REFERRAL_CODE'; end if;

  select created_at into v_created_at from public.customer_profiles where user_id = v_uid and status = 'ACTIVE';
  if v_created_at is null then raise exception 'CUSTOMER_PROFILE_REQUIRED'; end if;
  if v_created_at < now() - interval '14 days' then raise exception 'REFERRAL_WINDOW_EXPIRED'; end if;
  if exists(select 1 from public.bookings where customer_user_id = v_uid and status = 'COMPLETED' and deleted_at is null) then
    raise exception 'EXISTING_CUSTOMER_NOT_ELIGIBLE';
  end if;

  select user_id into v_inviter from public.customer_referral_codes where code = upper(trim(p_code)) and is_active;
  if v_inviter is null then raise exception 'REFERRAL_CODE_NOT_FOUND'; end if;
  if v_inviter = v_uid then raise exception 'SELF_REFERRAL_NOT_ALLOWED'; end if;

  if p_campaign_id is not null then
    select id into v_campaign_id from public.campaigns
    where id = p_campaign_id and is_active and publication_status = 'PUBLISHED'
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
  end if;

  v_landing_path := nullif(left(trim(coalesce(p_landing_path, '')), 800), '');
  if v_landing_path is not null and (left(v_landing_path, 1) <> '/' or left(v_landing_path, 2) = '//') then
    v_landing_path := null;
  end if;

  select * into v_existing from public.customer_referrals where invitee_user_id = v_uid;
  if found then
    return jsonb_build_object('ok',true,'status',v_existing.status,'alreadyClaimed',true,'sourceCampaignId',v_existing.source_campaign_id);
  end if;

  insert into public.customer_referrals(inviter_user_id,invitee_user_id,referral_code,source_campaign_id,landing_path)
  values(v_inviter,v_uid,upper(trim(p_code)),v_campaign_id,v_landing_path)
  returning * into v_existing;

  return jsonb_build_object('ok',true,'status',v_existing.status,'alreadyClaimed',false,'sourceCampaignId',v_existing.source_campaign_id);
end;
$$;

revoke all on function public.claim_customer_referral_context(text, uuid, text) from public;
grant execute on function public.claim_customer_referral_context(text, uuid, text) to authenticated;

update public.navigation_items
set item_key = 'account', label = 'Profil', icon = 'account_circle', route = '/account'
where surface = 'MOBILE_DOCK' and item_key = 'appointment';

update public.site_config
set value = jsonb_set(value,'{homeContent}',coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
  'heroTrustLine','YÜKSEKOVA''DAN HAKKÂRİ''YE · KİRALAMA · SATIŞ · TUR',
  'heroTitle','Yolculuğunuza yakışan aracı bulun.',
  'heroSubtitle','Kiralık araçtan ikinci el seçeneğe, şoförlü transferden özel gün ve bölgesel turlara kadar Yüksekova ve Hakkâri’de ihtiyacınıza uygun çözümü keşfedin. Şeffaf fiyatlar ve yerel ekip desteğiyle planınızı güvenle oluşturun.',
  'bookingTitle','Planınızı kolayca oluşturun',
  'bookingSubtitle','Nereye, ne zaman ve nasıl gitmek istediğinizi seçin; size uygun seçenekleri birlikte bulalım.',
  'plannerNote','Seçiminizi gönderin, yerel ekibimiz uygunluğu netleştirerek sizinle iletişime geçsin.',
  'featuredSubtitle','Şehir içinden uzun yola, işten özel güne kadar planınıza uygun araçları keşfedin.',
  'salesDescription','İhtiyacınıza ve bütçenize uygun ikinci el seçenekleri keşfedin; ayrıntıları inceleyip görüşme talebinizi kolayca oluşturun.',
  'toursSubtitle','Hakkâri ve Yüksekova’nın öne çıkan rotalarını yerel deneyimle keşfedin; size uyan turu seçin ve planınızı oluşturun.',
  'partnerSubtitle','Aracınızın bilgilerini paylaşın, ekibimiz satış veya filo değerlendirmesi için sizinle iletişime geçsin.',
  'whyUsSubtitle','Şeffaf fiyatlar, yerel deneyim ve ihtiyaç anında ulaşabileceğiniz ekiple yolculuğunuzu kolaylaştırıyoruz.'
),true), updated_at = now()
where key='site_settings';

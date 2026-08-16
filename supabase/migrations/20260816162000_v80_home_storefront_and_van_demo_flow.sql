-- V80: customer-first homepage ordering, richer pickup choices and a deterministic Van demo partner flow.

update public.homepage_sections set title='Yolculuğunuza Uyan Kiralık Araçlar', sort_order=10 where section_key='rental_featured';
update public.homepage_sections set title='Size Özel Fırsatlar', sort_order=15, max_items=3, settings=coalesce(settings,'{}'::jsonb) || '{"layout":"compact_offer_cards","showDiscount":true}'::jsonb where section_key='campaigns';
update public.homepage_sections set title='Yeni Aracınız Burada Olabilir', sort_order=20 where section_key='sale_featured';
update public.homepage_sections set title='Hakkâri''yi Keşfedin', sort_order=30 where section_key='tour_featured';
update public.homepage_sections set title='Size En Yakın Alperler Auto', sort_order=35, max_items=3 where section_key='branches';
update public.homepage_sections set title='Aracınız Değerini Bulsun', sort_order=40 where section_key='partner';
update public.homepage_sections set title='Yola Çıkmadan Önce', sort_order=50 where section_key='blog_featured';

update public.site_config
set value = jsonb_set(
  value,
  '{homeContent}',
  coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
    'heroTitle','Yolculuğunuz doğru araçla başlasın.',
    'heroSubtitle','Kiralama, satış ve seçili rotaları tek yerde keşfedin. Size uyan seçeneği bulun, ayrıntıları görün ve kararınızı güvenle verin.',
    'bookingTitle','Nereden başlayacağınızı seçin',
    'bookingSubtitle','Teslim noktanızı ve tarihinizi belirleyin; size uygun seçenekleri birlikte gösterelim.',
    'featuredBadge','Sizin İçin Seçilen Kiralık Araçlar',
    'featuredSubtitle','Günlük planınıza, kişi sayınıza ve bütçenize uyan araçları karşılaştırın.',
    'salesBadge','Sizin İçin Seçilen Satılık Araçlar',
    'salesDescription','Beğendiğiniz aracı ayrıntıları, donanımı ve fiyatıyla birlikte inceleyin.',
    'campaignBannerBadge','Avantajlı Seçimler',
    'campaignBannerTitle','Size Özel Fırsatlar',
    'campaignBannerSubtitle','Gerçek fiyat farkını görün. Size uyan fırsatı açın; tüm kapsam ve koşulları ayrıntı sayfasında inceleyin.',
    'campaignBannerButtonText','Fırsatı İncele',
    'toursSubtitle','Bölgenin doğal güzelliklerini, yerel rotaları ve deneyimleri tek yerden keşfedin.',
    'partnerTitle','Aracınız değerini bulsun',
    'partnerSubtitle','Aracınızı satmak veya kiralama filosunda değerlendirmek için bilgilerinizi gönderin. Ekibimiz size uygun yolu birlikte netleştirsin.'
  ),
  true
), updated_at=now()
where key='site_settings';

update public.campaigns
set short_description='7 günlük planınız varsa bir günlük kiralama bedeli cebinizde kalsın. Uygun tarihinizi seçin ve aracın ayrıntılarını görün.',
    cta_label='Uygun Tarihi Gör', updated_at=now()
where title='7 Gün Kirala, 6 Gün Öde | Renault Megane';
update public.campaigns
set short_description='Özel gününüzde araç, şoför ve süsleme planını tek yerde tamamlayın. Tarihinizi seçin, paket ayrıntılarını görün.',
    cta_label='Tarihi Kontrol Et', updated_at=now()
where title='Gelin Arabası | Şoförlü Özel Gün Paketi';
update public.campaigns
set short_description='Ulaşım ve rota planını tek noktadan çözün. Tarihinizi seçin ve Cilo deneyiminin tüm ayrıntılarını görün.',
    cta_label='Turu Keşfet', updated_at=now()
where title='Cilo Dağları & Buzullar | Uzman Tur Deneyimi';

update public.branches
set phone='0537 959 48 51', whatsapp='905379594851',
    services='["RENTAL","SALES","TOUR","TRANSFER","PICKUP","RETURN"]'::jsonb,
    is_active=true, is_pickup_point=true, is_return_point=true, public_status='ACTIVE',
    service_rules=coalesce(service_rules,'{}'::jsonb) || jsonb_build_object(
      'pickupLocations',jsonb_build_array('Yüksekova Merkez','Yüksekova Selahaddin Eyyubi Havalimanı','Yüksekova Otogar','Yüksekova içinde adrese teslim talebi')
    ), updated_at=now()
where code='YUKSEKOVA';

update public.branches
set phone='0537 959 48 51', whatsapp='905379594851', email='alperlerauto@gmail.com',
    services='["RENTAL","TOUR","TRANSFER","PICKUP","RETURN"]'::jsonb,
    is_active=true, is_pickup_point=true, is_return_point=true, public_status='ACTIVE', sort_order=20,
    public_description='Yeşiltaş ve Dağlıca yönündeki teslim, iade ve tur buluşma operasyonlarını destekleyen Alperler Auto hizmet noktası.',
    service_rules=coalesce(service_rules,'{}'::jsonb) || jsonb_build_object(
      'pickupLocations',jsonb_build_array('Yeşiltaş / Dağlıca Operasyon Noktası')
    ), updated_at=now()
where code='YESILTAS-OPS';

do $v80$
declare
  v_actor uuid;
  v_reference text;
  v_branch jsonb;
  v_branch_id uuid;
begin
  select user_id into v_actor
  from public.admin_users
  where is_active=true
  order by case when lower(role)='owner' then 0 else 1 end, created_at
  limit 1;
  if v_actor is null then raise exception 'V80_DEMO_ADMIN_REQUIRED'; end if;

  insert into public.branch_partner_requests(
    idempotency_key, full_name, phone, email, city, district, operating_area,
    current_business, experience_years, office_status, current_fleet_size,
    planned_fleet_size, services, listing_model, budget_range, notes,
    status, internal_notes, source_path, approved_at, approved_by, submitted_at
  ) values (
    'demo:van:2026-08-16', 'Van Demo Bayi Yetkilisi', '0537 959 48 51',
    'van.demo@alperler.invalid', 'Van', 'İpekyolu', 'Van Merkez / İpekyolu',
    'Alperler Auto Van Demo Bayi', 5, 'PLAN', 0, 8,
    '["RENTAL","SALES","TOUR_TRANSFER"]'::jsonb, 'BOTH', 'DISCUSS',
    'Sistem içi uçtan uca bayilik akışı testi. Gerçek bayi bilgileri daha sonra değiştirilecektir.',
    'APPROVED', 'V80 demo: başvuru, provisioning, politika, fiyat ve aktivasyon akışını doğrulamak için oluşturuldu.',
    '/branch-partner?demo=van', now(), v_actor, now()
  )
  on conflict (idempotency_key) do update set
    full_name=excluded.full_name, phone=excluded.phone, email=excluded.email,
    city=excluded.city, district=excluded.district, operating_area=excluded.operating_area,
    current_business=excluded.current_business, planned_fleet_size=excluded.planned_fleet_size,
    services=excluded.services, listing_model=excluded.listing_model, status='APPROVED',
    internal_notes=excluded.internal_notes, approved_at=coalesce(public.branch_partner_requests.approved_at,now()),
    approved_by=coalesce(public.branch_partner_requests.approved_by,v_actor), updated_at=now()
  returning reference into v_reference;

  v_branch := public.provision_branch_partner_request(v_reference,v_actor,'Van Demo Bayi');
  v_branch_id := (v_branch->>'branchId')::uuid;

  update public.branches
  set name='Van Demo Bayi', city='Van', district='İpekyolu',
      address_line='Van Merkez / İpekyolu (Demo Şube)', phone='0537 959 48 51',
      whatsapp='905379594851', email='van.demo@alperler.invalid',
      services='["RENTAL","SALES","TOUR","TRANSFER","PICKUP","RETURN"]'::jsonb,
      is_pickup_point=true, is_return_point=true, sort_order=30,
      territory_label='Van Merkez / İpekyolu · Demo operasyon bölgesi',
      public_description='Bu kayıt Alperler Auto bayi altyapısının uçtan uca test edildiğini göstermek için açılmış demo şubedir. İlanlar yalnız bu şubeye atanıp merkez onayından geçtiğinde burada görünür.',
      customer_guarantee_enabled=true, central_pricing_required=true, listing_requires_approval=true,
      service_rules=coalesce(service_rules,'{}'::jsonb) || jsonb_build_object(
        'demo',true,
        'pickupLocations',jsonb_build_array('Van Merkez (Demo)','Van Ferit Melen Havalimanı (Demo)','Van Otogar (Demo)')
      ),
      brand_profile=coalesce(brand_profile,'{}'::jsonb) || jsonb_build_object('displayBadge','Demo Bayi','demo',true),
      is_active=false, public_status='DRAFT', updated_at=now()
  where id=v_branch_id;

  update public.branch_setup_checklist
  set completed_at=coalesce(completed_at,now()), completed_by=coalesce(completed_by,v_actor),
      notes=coalesce(notes,'V80 demo akışında doğrulandı.'), updated_at=now()
  where branch_id=v_branch_id and is_required=true;

  insert into public.branch_policy_acceptances(branch_id,policy_rule_id,accepted_by,metadata)
  select v_branch_id,r.id,v_actor,jsonb_build_object('demo',true,'source','van_demo_flow')
  from public.network_policy_rules r
  where r.is_active=true and r.is_required=true
  on conflict (branch_id,policy_rule_id) do update set accepted_by=excluded.accepted_by, accepted_at=now(), metadata=excluded.metadata;

  delete from public.branch_pricing_rules
  where branch_id=v_branch_id and vehicle_class='*' and category in ('RENTAL','SALE');

  insert into public.branch_pricing_rules(branch_id,category,vehicle_class,min_price,max_price,recommended_price,currency,enforce_min,enforce_max,is_active)
  values
    (v_branch_id,'RENTAL','*',2500,8500,4500,'TRY',true,true,true),
    (v_branch_id,'SALE','*',1350000,2620000,2070000,'TRY',true,true,true);

  update public.branches
  set is_active=true, public_status='ACTIVE', updated_at=now()
  where id=v_branch_id;
end
$v80$;
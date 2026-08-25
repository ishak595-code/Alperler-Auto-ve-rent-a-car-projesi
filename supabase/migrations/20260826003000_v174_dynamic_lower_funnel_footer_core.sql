-- V174 Dynamic Lower Funnel & Footer Core
-- Additive phase: public reads stay compatible and legacy authenticated admin writes are revoked only after V174 production cutover.

create or replace function private.can_actor_manage_content_v174(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id=p_actor and a.is_active=true
      and (
        lower(coalesce(a.role,'')) in ('owner','admin')
        or coalesce((a.permissions->>'content.manage')::boolean,false)
        or coalesce((a.permissions->>'settings.manage')::boolean,false)
      )
  );
$$;
revoke all on function private.can_actor_manage_content_v174(uuid) from public,anon,authenticated;
grant execute on function private.can_actor_manage_content_v174(uuid) to service_role;

create or replace function private.can_actor_manage_settings_v174(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id=p_actor and a.is_active=true
      and (
        lower(coalesce(a.role,'')) in ('owner','admin')
        or coalesce((a.permissions->>'settings.manage')::boolean,false)
      )
  );
$$;
revoke all on function private.can_actor_manage_settings_v174(uuid) from public,anon,authenticated;
grant execute on function private.can_actor_manage_settings_v174(uuid) to service_role;

create table if not exists public.footer_links (
  link_key text primary key,
  config_key text not null default 'main' references public.footer_settings(config_key) on delete cascade,
  group_key text not null,
  label text not null,
  action_type text not null default 'ROUTE',
  route text,
  query_params jsonb not null default '{}'::jsonb,
  external_url text,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  opens_new_tab boolean not null default false,
  is_secondary boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint footer_links_key_format_check check (link_key ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  constraint footer_links_group_check check (group_key in ('SERVICES','CORPORATE','LEGAL','BOTTOM')),
  constraint footer_links_action_check check (action_type in ('ROUTE','LEGAL','FEEDBACK','EXTERNAL','ADMIN')),
  constraint footer_links_label_check check (char_length(btrim(label)) between 1 and 100),
  constraint footer_links_query_object_check check (jsonb_typeof(query_params)='object'),
  constraint footer_links_target_check check (
    (action_type in ('ROUTE','LEGAL','ADMIN') and route is not null and route ~ '^/' and external_url is null)
    or (action_type='EXTERNAL' and external_url is not null and external_url ~ '^https://' and route is null)
    or (action_type='FEEDBACK' and route is null and external_url is null)
  )
);

create index if not exists footer_links_public_order_v174_idx
  on public.footer_links(config_key,group_key,sort_order,link_key)
  where is_enabled=true;

alter table public.footer_links enable row level security;
drop policy if exists footer_links_public_read_v174 on public.footer_links;
create policy footer_links_public_read_v174 on public.footer_links
  for select to anon,authenticated
  using (config_key='main' and is_enabled=true);

revoke all on table public.footer_links from public,anon,authenticated;
grant select on table public.footer_links to anon,authenticated;
grant all on table public.footer_links to service_role;

insert into public.footer_links(link_key,group_key,label,action_type,route,query_params,sort_order,is_enabled,opens_new_tab,is_secondary)
values
  ('services.rentals','SERVICES','Kiralık Araçlar','ROUTE','/fleet','{}',10,true,false,false),
  ('services.sales','SERVICES','Satılık Araçlar','ROUTE','/sales','{}',20,true,false,false),
  ('services.valuation','SERVICES','Aracını Değerlendir','ROUTE','/list-your-car','{}',30,true,false,false),
  ('services.tours','SERVICES','Turlar','ROUTE','/tours','{}',40,true,false,false),
  ('services.campaigns','SERVICES','Kampanyalar','ROUTE','/campaigns','{}',50,true,false,false),
  ('services.branches','SERVICES','Şubelerimiz','ROUTE','/branches','{}',60,true,false,false),
  ('services.appointment','SERVICES','Randevu','ROUTE','/appointment','{}',70,true,false,false),
  ('corporate.about','CORPORATE','Hakkımızda','ROUTE','/about','{}',10,true,false,false),
  ('corporate.blog','CORPORATE','Blog','ROUTE','/blog','{}',20,true,false,false),
  ('corporate.contact','CORPORATE','İletişim','ROUTE','/contact','{}',30,true,false,false),
  ('corporate.faq','CORPORATE','Sık Sorulan Sorular','ROUTE','/faq','{}',40,true,false,false),
  ('corporate.branch_partner','CORPORATE','Şube Başvurusu','ROUTE','/branch-partner','{}',50,true,false,false),
  ('corporate.feedback','CORPORATE','Geri Bildirim Gönder','FEEDBACK',null,'{}',60,true,false,false),
  ('legal.rental','LEGAL','Kiralama Koşulları','LEGAL','/legal','{"type":"rental"}',10,true,false,false),
  ('legal.insurance','LEGAL','Sigorta ve Sorumluluk','LEGAL','/legal','{"type":"insurance"}',20,true,false,false),
  ('legal.cancellation','LEGAL','İade ve İptal','LEGAL','/legal','{"type":"cancellation"}',30,true,false,false),
  ('legal.kvkk','LEGAL','KVKK Aydınlatma','LEGAL','/legal','{"type":"kvkk"}',40,true,false,false),
  ('legal.privacy','LEGAL','Gizlilik','LEGAL','/legal','{"type":"privacy"}',50,true,false,false),
  ('legal.sales','LEGAL','Satış ve İlan Koşulları','LEGAL','/legal','{"type":"sales"}',60,true,false,true),
  ('legal.tour','LEGAL','Tur ve Transfer Koşulları','LEGAL','/legal','{"type":"tour"}',70,true,false,true),
  ('legal.partner','LEGAL','Aracını Değerlendir Koşulları','LEGAL','/legal','{"type":"partner"}',80,true,false,true),
  ('legal.branch','LEGAL','Şube ve Bayilik Koşulları','LEGAL','/legal','{"type":"branch"}',90,true,false,true),
  ('legal.commercial','LEGAL','Bülten ve Ticari İleti','LEGAL','/legal','{"type":"commercial-communication"}',100,true,false,true),
  ('legal.terms','LEGAL','Genel Kullanım Şartları','LEGAL','/legal','{"type":"terms"}',110,true,false,true),
  ('legal.cookies','LEGAL','Çerez Politikası','LEGAL','/legal','{"type":"cookies"}',120,true,false,true),
  ('bottom.admin','BOTTOM','Yönetici','ADMIN','/admin/login','{}',10,true,false,false)
on conflict(link_key) do nothing;

-- Preserve existing lower-home content and remove remaining hard-coded branch partner CTA copy.
update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'partnerCtaTitle','Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?',
  'partnerCtaLabel','Bayilik Başvurusu',
  'partnerRoute',coalesce(nullif(settings->>'partnerRoute',''),'/branch-partner'),
  'showPartnerCta',coalesce((settings->>'showPartnerCta')::boolean,true)
), updated_at=now()
where section_key='branches';

insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_at)
values(
  'prefooter_action',
  'Planınızı Birlikte Netleştirelim',
  'CUSTOM',
  true,
  60,
  1,
  jsonb_build_object(
    'renderer','PREFOOTER',
    'badge','Size Uygun Sonraki Adım',
    'description','Araç kiralama, ikinci el araç, tur, transfer, randevu veya aracınızı değerlendirme konusunda hangi adımın size uygun olduğunu birlikte netleştirin.',
    'theme','graphite',
    'width','wide',
    'layout','wide',
    'ctaLabel','Bize Ulaşın',
    'ctaUrl','/contact',
    'secondaryCtaLabel','Randevu Oluştur',
    'secondaryCtaUrl','/appointment',
    'trustItems',jsonb_build_array('Kiralama, satış, tur ve transfer tek ekipte','WhatsApp ve telefon desteği','İçerikler canlı katalog ve şube verisinden gelir')
  ),
  now()
)
on conflict(section_key) do nothing;

-- Keep footer links in the same realtime refresh channel as footer_settings.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='footer_links') then
    alter publication supabase_realtime add table public.footer_links;
  end if;
end $$;

create or replace function public.service_site_content_snapshot_v174(p_actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_footer jsonb;
  v_links jsonb;
  v_sections jsonb;
  v_placements jsonb;
begin
  if not (private.can_actor_manage_content_v174(p_actor) or private.can_actor_manage_settings_v174(p_actor)) then
    raise exception using errcode='42501',message='SITE_CONTENT_PERMISSION_REQUIRED';
  end if;
  select to_jsonb(f) into v_footer from public.footer_settings f where f.config_key='main';
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_links from public.footer_links l where l.config_key='main';
  select coalesce(jsonb_agg(to_jsonb(s) order by s.sort_order,s.section_key),'[]'::jsonb) into v_sections from public.homepage_sections s;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.section_key,p.sort_order,p.id),'[]'::jsonb) into v_placements from public.homepage_placements p;
  return jsonb_build_object('ok',true,'footerSettings',v_footer,'footerLinks',v_links,'homepageSections',v_sections,'homepagePlacements',v_placements);
end;
$$;
revoke all on function public.service_site_content_snapshot_v174(uuid) from public,anon,authenticated;
grant execute on function public.service_site_content_snapshot_v174(uuid) to service_role;

create or replace function public.service_save_footer_bundle_v174(p_actor uuid,p_settings jsonb,p_links jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_before_settings jsonb;
  v_before_links jsonb;
  v_after_settings jsonb;
  v_after_links jsonb;
  v_item jsonb;
  v_key text;
  v_group text;
  v_label text;
  v_action text;
  v_route text;
  v_external text;
  v_query jsonb;
  v_actor_email text;
begin
  if not private.can_actor_manage_settings_v174(p_actor) then raise exception using errcode='42501',message='SETTINGS_PERMISSION_REQUIRED'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception using errcode='22023',message='FOOTER_SETTINGS_REQUIRED'; end if;
  if p_links is null or jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>100 then raise exception using errcode='22023',message='FOOTER_LINKS_INVALID'; end if;

  select to_jsonb(f) into v_before_settings from public.footer_settings f where config_key='main' for update;
  if v_before_settings is null then raise exception using errcode='P0002',message='FOOTER_SETTINGS_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_before_links from public.footer_links l where config_key='main';

  update public.footer_settings set
    is_enabled=coalesce((p_settings->>'isEnabled')::boolean,is_enabled),
    brand_summary=left(coalesce(nullif(btrim(p_settings->>'brandSummary'),''),brand_summary),700),
    services_title=left(coalesce(nullif(btrim(p_settings->>'servicesTitle'),''),services_title),80),
    corporate_title=left(coalesce(nullif(btrim(p_settings->>'corporateTitle'),''),corporate_title),80),
    legal_title=left(coalesce(nullif(btrim(p_settings->>'legalTitle'),''),legal_title),80),
    newsletter_enabled=coalesce((p_settings->>'newsletterEnabled')::boolean,newsletter_enabled),
    newsletter_title=left(coalesce(nullif(btrim(p_settings->>'newsletterTitle'),''),newsletter_title),180),
    newsletter_description=left(coalesce(p_settings->>'newsletterDescription',newsletter_description),500),
    newsletter_button_text=left(coalesce(nullif(btrim(p_settings->>'newsletterButtonText'),''),newsletter_button_text),80),
    show_phone=coalesce((p_settings->>'showPhone')::boolean,show_phone),
    show_whatsapp=coalesce((p_settings->>'showWhatsapp')::boolean,show_whatsapp),
    show_social=coalesce((p_settings->>'showSocial')::boolean,show_social),
    show_feedback=coalesce((p_settings->>'showFeedback')::boolean,show_feedback),
    show_legal_links=coalesce((p_settings->>'showLegalLinks')::boolean,show_legal_links),
    updated_at=now()
  where config_key='main';

  delete from public.footer_links where config_key='main';
  for v_item in select value from jsonb_array_elements(p_links) loop
    v_key=lower(btrim(coalesce(v_item->>'linkKey','')));
    v_group=upper(btrim(coalesce(v_item->>'groupKey','')));
    v_label=left(btrim(coalesce(v_item->>'label','')),100);
    v_action=upper(btrim(coalesce(v_item->>'actionType','ROUTE')));
    v_route=nullif(left(btrim(coalesce(v_item->>'route','')),300),'');
    v_external=nullif(left(btrim(coalesce(v_item->>'externalUrl','')),1000),'');
    v_query=coalesce(v_item->'queryParams','{}'::jsonb);
    if v_key !~ '^[a-z0-9][a-z0-9._-]{0,79}$' or v_group not in ('SERVICES','CORPORATE','LEGAL','BOTTOM') or char_length(v_label)<1 or v_action not in ('ROUTE','LEGAL','FEEDBACK','EXTERNAL','ADMIN') or jsonb_typeof(v_query)<>'object' then
      raise exception using errcode='22023',message='FOOTER_LINK_INVALID';
    end if;
    if v_action in ('ROUTE','LEGAL','ADMIN') and (v_route is null or v_route !~ '^/' or v_external is not null) then raise exception using errcode='22023',message='FOOTER_ROUTE_INVALID'; end if;
    if v_action='EXTERNAL' and (v_external is null or v_external !~ '^https://' or v_route is not null) then raise exception using errcode='22023',message='FOOTER_EXTERNAL_URL_INVALID'; end if;
    if v_action='FEEDBACK' then v_route=null;v_external=null;v_query='{}'::jsonb;end if;
    insert into public.footer_links(link_key,config_key,group_key,label,action_type,route,query_params,external_url,sort_order,is_enabled,opens_new_tab,is_secondary,updated_by,updated_at)
    values(v_key,'main',v_group,v_label,v_action,v_route,v_query,v_external,
      greatest(0,least(coalesce((v_item->>'sortOrder')::integer,0),10000)),
      coalesce((v_item->>'isEnabled')::boolean,true),coalesce((v_item->>'opensNewTab')::boolean,false),coalesce((v_item->>'isSecondary')::boolean,false),p_actor,now());
  end loop;

  select to_jsonb(f) into v_after_settings from public.footer_settings f where config_key='main';
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_after_links from public.footer_links l where config_key='main';
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'FOOTER_BUNDLE_UPDATED_V174','footer_settings','main',jsonb_build_object('settings',v_before_settings,'links',v_before_links),jsonb_build_object('settings',v_after_settings,'links',v_after_links),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'footerSettings',v_after_settings,'footerLinks',v_after_links);
end;
$$;
revoke all on function public.service_save_footer_bundle_v174(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.service_save_footer_bundle_v174(uuid,jsonb,jsonb) to service_role;

create or replace function public.service_upsert_homepage_section_v174(p_actor uuid,p_section jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_key text:=lower(btrim(coalesce(p_section->>'sectionKey','')));
  v_title text:=left(btrim(coalesce(p_section->>'title','')),140);
  v_type text:=upper(btrim(coalesce(p_section->>'sectionType','')));
  v_settings jsonb:=coalesce(p_section->'settings','{}'::jsonb);
  v_before jsonb;
  v_after public.homepage_sections%rowtype;
  v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if v_key !~ '^[a-z0-9][a-z0-9_-]{0,79}$' or char_length(v_title)<1 or v_type not in ('VEHICLES','TOURS','BLOG','CAMPAIGN','CUSTOM') or jsonb_typeof(v_settings)<>'object' then raise exception using errcode='22023',message='HOMEPAGE_SECTION_INVALID'; end if;
  if coalesce(v_settings->>'ctaUrl','')<>'' and v_settings->>'ctaUrl' !~ '^/' then raise exception using errcode='22023',message='HOMEPAGE_CTA_ROUTE_INVALID'; end if;
  if coalesce(v_settings->>'secondaryCtaUrl','')<>'' and v_settings->>'secondaryCtaUrl' !~ '^/' then raise exception using errcode='22023',message='HOMEPAGE_CTA_ROUTE_INVALID'; end if;
  if coalesce(v_settings->>'viewAllUrl','')<>'' and v_settings->>'viewAllUrl' !~ '^/' then raise exception using errcode='22023',message='HOMEPAGE_VIEW_ROUTE_INVALID'; end if;
  select to_jsonb(s) into v_before from public.homepage_sections s where s.section_key=v_key;
  insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_by,updated_at)
  values(v_key,v_title,v_type,coalesce((p_section->>'isEnabled')::boolean,true),greatest(0,least(coalesce((p_section->>'sortOrder')::integer,0),10000)),greatest(1,least(coalesce((p_section->>'maxItems')::integer,4),50)),v_settings,p_actor,now())
  on conflict(section_key) do update set title=excluded.title,section_type=excluded.section_type,is_enabled=excluded.is_enabled,sort_order=excluded.sort_order,max_items=excluded.max_items,settings=excluded.settings,updated_by=p_actor,updated_at=now()
  returning * into v_after;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_SECTION_UPSERTED_V174','homepage_section',v_key,v_before,to_jsonb(v_after),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'section',to_jsonb(v_after));
end;
$$;
revoke all on function public.service_upsert_homepage_section_v174(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_upsert_homepage_section_v174(uuid,jsonb) to service_role;

create or replace function public.service_delete_homepage_section_v174(p_actor uuid,p_section_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_key text:=lower(btrim(coalesce(p_section_key,'')));v_before jsonb;v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  select to_jsonb(s) into v_before from public.homepage_sections s where s.section_key=v_key for update;
  if v_before is null then raise exception using errcode='P0002',message='HOMEPAGE_SECTION_NOT_FOUND'; end if;
  delete from public.homepage_sections where section_key=v_key;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_SECTION_DELETED_V174','homepage_section',v_key,v_before,null,jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'sectionKey',v_key);
end;
$$;
revoke all on function public.service_delete_homepage_section_v174(uuid,text) from public,anon,authenticated;
grant execute on function public.service_delete_homepage_section_v174(uuid,text) to service_role;

create or replace function public.service_reorder_homepage_sections_v174(p_actor uuid,p_keys jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_key text;v_index integer:=0;v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if p_keys is null or jsonb_typeof(p_keys)<>'array' or jsonb_array_length(p_keys)>100 then raise exception using errcode='22023',message='HOMEPAGE_ORDER_INVALID'; end if;
  for v_key in select value from jsonb_array_elements_text(p_keys) loop
    v_index:=v_index+1;
    update public.homepage_sections set sort_order=v_index*10,updated_by=p_actor,updated_at=now() where section_key=v_key;
    if not found then raise exception using errcode='P0002',message='HOMEPAGE_SECTION_NOT_FOUND'; end if;
  end loop;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_SECTIONS_REORDERED_V174','homepage_sections','global',jsonb_build_object('keys',p_keys),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'count',v_index);
end;
$$;
revoke all on function public.service_reorder_homepage_sections_v174(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_reorder_homepage_sections_v174(uuid,jsonb) to service_role;

create or replace function public.service_upsert_homepage_placement_v174(p_actor uuid,p_placement jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_id uuid:=case when nullif(btrim(coalesce(p_placement->>'id','')),'') is null then null else (p_placement->>'id')::uuid end;
  v_section text:=lower(btrim(coalesce(p_placement->>'sectionKey','')));
  v_entity_type text:=upper(btrim(coalesce(p_placement->>'entityType','')));
  v_entity_id uuid:=(p_placement->>'entityId')::uuid;
  v_metadata jsonb:=coalesce(p_placement->'metadata','{}'::jsonb);
  v_before jsonb;
  v_after public.homepage_placements%rowtype;
  v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if v_section='' or v_entity_type not in ('VEHICLE','TOUR','BLOG','CAMPAIGN') or jsonb_typeof(v_metadata)<>'object' then raise exception using errcode='22023',message='HOMEPAGE_PLACEMENT_INVALID'; end if;
  if v_id is not null then select to_jsonb(p) into v_before from public.homepage_placements p where p.id=v_id; end if;
  if v_id is null then
    insert into public.homepage_placements(section_key,entity_type,entity_id,label,sort_order,is_active,starts_at,ends_at,metadata,created_by,created_at,updated_at)
    values(v_section,v_entity_type,v_entity_id,nullif(left(btrim(coalesce(p_placement->>'label','')),180),''),greatest(0,least(coalesce((p_placement->>'sortOrder')::integer,0),10000)),coalesce((p_placement->>'isActive')::boolean,true),nullif(p_placement->>'startsAt','')::timestamptz,nullif(p_placement->>'endsAt','')::timestamptz,v_metadata,p_actor,now(),now())
    on conflict(section_key,entity_type,entity_id) do update set label=excluded.label,sort_order=excluded.sort_order,is_active=excluded.is_active,starts_at=excluded.starts_at,ends_at=excluded.ends_at,metadata=excluded.metadata,updated_at=now()
    returning * into v_after;
  else
    update public.homepage_placements set label=nullif(left(btrim(coalesce(p_placement->>'label','')),180),''),sort_order=greatest(0,least(coalesce((p_placement->>'sortOrder')::integer,0),10000)),is_active=coalesce((p_placement->>'isActive')::boolean,true),starts_at=nullif(p_placement->>'startsAt','')::timestamptz,ends_at=nullif(p_placement->>'endsAt','')::timestamptz,metadata=v_metadata,updated_at=now()
    where id=v_id returning * into v_after;
    if not found then raise exception using errcode='P0002',message='HOMEPAGE_PLACEMENT_NOT_FOUND'; end if;
  end if;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_PLACEMENT_UPSERTED_V174','homepage_placement',v_after.id::text,v_before,to_jsonb(v_after),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'placement',to_jsonb(v_after));
end;
$$;
revoke all on function public.service_upsert_homepage_placement_v174(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_upsert_homepage_placement_v174(uuid,jsonb) to service_role;

create or replace function public.service_delete_homepage_placement_v174(p_actor uuid,p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_before jsonb;v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  select to_jsonb(p) into v_before from public.homepage_placements p where p.id=p_id for update;
  if v_before is null then raise exception using errcode='P0002',message='HOMEPAGE_PLACEMENT_NOT_FOUND'; end if;
  delete from public.homepage_placements where id=p_id;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_PLACEMENT_DELETED_V174','homepage_placement',p_id::text,v_before,null,jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'id',p_id);
end;
$$;
revoke all on function public.service_delete_homepage_placement_v174(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_delete_homepage_placement_v174(uuid,uuid) to service_role;

create or replace function public.service_reorder_homepage_placements_v174(p_actor uuid,p_ids jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_raw text;v_id uuid;v_index integer:=0;v_actor_email text;
begin
  if not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if p_ids is null or jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids)>200 then raise exception using errcode='22023',message='HOMEPAGE_PLACEMENT_ORDER_INVALID'; end if;
  for v_raw in select value from jsonb_array_elements_text(p_ids) loop
    v_id:=v_raw::uuid;v_index:=v_index+1;
    update public.homepage_placements set sort_order=v_index,updated_at=now() where id=v_id;
    if not found then raise exception using errcode='P0002',message='HOMEPAGE_PLACEMENT_NOT_FOUND'; end if;
  end loop;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'HOMEPAGE_PLACEMENTS_REORDERED_V174','homepage_placements','global',jsonb_build_object('ids',p_ids),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'count',v_index);
end;
$$;
revoke all on function public.service_reorder_homepage_placements_v174(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_reorder_homepage_placements_v174(uuid,jsonb) to service_role;

comment on table public.footer_links is 'V174 dynamic footer navigation. Public reads enabled links; all writes are service-role controlled.';
comment on function public.service_save_footer_bundle_v174(uuid,jsonb,jsonb) is 'Atomic V174 footer settings and link bundle mutation with settings permission and audit trail.';
comment on function public.service_upsert_homepage_section_v174(uuid,jsonb) is 'V174 service-only homepage section mutation with content permission and audit trail.';

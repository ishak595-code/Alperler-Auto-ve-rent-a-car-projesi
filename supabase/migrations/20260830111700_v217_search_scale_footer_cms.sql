-- V217 scalable public discovery and footer content ownership.
-- Search stays SECURITY INVOKER so existing RLS remains authoritative.

create extension if not exists pg_trgm with schema extensions;

alter table public.footer_settings
  add column if not exists home_label text not null default 'Ana Sayfa',
  add column if not exists contact_label text not null default 'İletişim',
  add column if not exists phone_label text not null default 'Telefon',
  add column if not exists whatsapp_label text not null default 'WhatsApp',
  add column if not exists default_tagline text not null default 'Kiralama • Satış • Tur',
  add column if not exists whatsapp_default_message text not null default 'Merhaba, Alperler Rent A Car hizmetleri hakkında bilgi almak istiyorum.',
  add column if not exists legal_more_label text not null default 'Diğer yasal bilgiler',
  add column if not exists newsletter_email_label text not null default 'E-posta adresi',
  add column if not exists newsletter_email_placeholder text not null default 'ornek@eposta.com',
  add column if not exists newsletter_free_note text not null default 'Abonelik ücretsizdir.',
  add column if not exists newsletter_legal_label text not null default 'Ticari ileti ve abonelik koşulları',
  add column if not exists newsletter_success_message text not null default 'Aboneliğiniz kaydedildi.',
  add column if not exists newsletter_invalid_email_message text not null default 'Geçerli bir e-posta adresi girin.',
  add column if not exists newsletter_error_message text not null default 'Abonelik şu anda tamamlanamadı. Lütfen tekrar deneyin.',
  add column if not exists copyright_suffix text not null default 'Tüm hakları saklıdır.';

create or replace function private.search_normalize_v217(value text)
returns text language sql immutable parallel safe set search_path=pg_catalog as $$
  select btrim(regexp_replace(translate(lower(coalesce(value,'')),'çğıöşüâîû','cgiosuaiu'),'[^a-z0-9]+',' ','g'));
$$;
create or replace function private.search_join_v217(variadic parts text[])
returns text language sql immutable parallel safe set search_path=pg_catalog,private as $$
  select private.search_normalize_v217(array_to_string(parts,' ',' '));
$$;
revoke all on function private.search_normalize_v217(text) from public,anon,authenticated;
revoke all on function private.search_join_v217(text[]) from public,anon,authenticated;

create index if not exists vehicles_public_search_trgm_v217 on public.vehicles using gin (
  private.search_join_v217(id::text,stock_code,brand,model,model_year::text,fuel_type,transmission,body_type,color,engine,location,seo_slug,metadata->>'series',metadata->>'plate',metadata->>'plateNumber',metadata->>'vehicleNumber',metadata->>'vehicleNo',metadata->>'vin',metadata->>'chassisNumber',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;
create index if not exists tours_public_search_trgm_v217 on public.tours using gin (
  private.search_join_v217(id::text,title,seo_slug,category,short_description,duration,meeting_point,location_name,metadata->>'badge',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;
create index if not exists blog_posts_public_search_trgm_v217 on public.blog_posts using gin (
  private.search_join_v217(id::text,title,slug,excerpt,author_name,seo_title,seo_description,metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where status='PUBLISHED';
create index if not exists campaigns_public_search_trgm_v217 on public.campaigns using gin (
  private.search_join_v217(id::text,title,slug,short_description,description,badge,campaign_type,cta_label) extensions.gin_trgm_ops
) where is_active=true;
create index if not exists branches_public_search_trgm_v217 on public.branches using gin (
  private.search_join_v217(id::text,name,code,slug,district,city,address_line,territory_label,public_description,operator_display_name,operator_legal_name) extensions.gin_trgm_ops
) where is_active=true;
create index if not exists faqs_public_search_trgm_v217 on public.faqs using gin (
  private.search_join_v217(id::text,question,answer,category) extensions.gin_trgm_ops
) where is_active=true;
create index if not exists homepage_sections_public_search_trgm_v217 on public.homepage_sections using gin (
  private.search_join_v217(section_key,title,settings->>'description',settings->>'badge') extensions.gin_trgm_ops
) where is_enabled=true;
create index if not exists navigation_items_public_search_trgm_v217 on public.navigation_items using gin (
  private.search_join_v217(id::text,item_key,label,route) extensions.gin_trgm_ops
) where is_active=true and archived_at is null;

create or replace function public.public_global_search_v217(p_query text,p_kinds text[] default null,p_limit integer default 40,p_offset integer default 0)
returns table(result_key text,kind text,title text,summary text,meta text,image text,route text,score integer)
language sql stable security invoker set search_path=pg_catalog,public,private,extensions as $$
with input as (
  select private.search_normalize_v217(left(coalesce(p_query,''),120)) q,
         greatest(1,least(coalesce(p_limit,40),100)) lim,
         greatest(0,least(coalesce(p_offset,0),10000)) off
), vehicle_rows as (
  select 'VEHICLE:'||v.id::text,case when v.category='SALE' then 'SALE' else 'RENTAL' end,
    trim(concat_ws(' ',v.brand,v.model,v.model_year::text)),coalesce(v.description,v.location,''),trim(concat_ws(' · ',v.model_year::text,v.transmission,v.fuel_type,v.location)),
    coalesce(nullif(v.cover_image,''),nullif(v.images->>0,'')),(case when v.category='SALE' then '/sales/' else '/fleet/' end)||coalesce(nullif(v.seo_slug,''),v.id::text),
    case when private.search_normalize_v217(v.id::text)=i.q then 1000 when private.search_normalize_v217(v.stock_code)=i.q then 990 when private.search_normalize_v217(v.seo_slug)=i.q then 980 when private.search_join_v217(v.brand,v.model,v.model_year::text)=i.q then 950 when private.search_normalize_v217(v.stock_code) like i.q||'%' then 920 when private.search_join_v217(v.brand,v.model,v.model_year::text) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id'),i.q))::int) end
  from public.vehicles v cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or (case when v.category='SALE' then 'SALE' else 'RENTAL' end)=any(p_kinds))
    and private.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id') like '%'||i.q||'%'
), tour_rows as (
  select 'TOUR:'||t.id::text,'TOUR',t.title,coalesce(t.short_description,t.description,''),trim(concat_ws(' · ',t.duration,t.location_name)),t.cover_image,'/tour/'||coalesce(nullif(t.seo_slug,''),t.id::text),
    case when private.search_normalize_v217(t.id::text)=i.q then 1000 when private.search_normalize_v217(t.seo_slug)=i.q then 980 when private.search_normalize_v217(t.title)=i.q then 950 when private.search_normalize_v217(t.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id'),i.q))::int) end
  from public.tours t cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'TOUR'=any(p_kinds)) and private.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id') like '%'||i.q||'%'
), blog_rows as (
  select 'BLOG:'||b.id::text,'BLOG',b.title,coalesce(b.excerpt,''),coalesce(b.author_name,'Blog'),b.cover_image,'/blog/'||coalesce(nullif(b.slug,''),b.id::text),
    case when private.search_normalize_v217(b.id::text)=i.q then 1000 when private.search_normalize_v217(b.slug)=i.q then 980 when private.search_normalize_v217(b.title)=i.q then 950 when private.search_normalize_v217(b.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id'),i.q))::int) end
  from public.blog_posts b cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'BLOG'=any(p_kinds)) and private.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id') like '%'||i.q||'%'
), campaign_rows as (
  select 'CAMPAIGN:'||c.id::text,'CAMPAIGN',c.title,coalesce(c.short_description,c.description,''),coalesce(c.badge,'Kampanya'),c.cover_image,coalesce(nullif(c.cta_url,''),'/campaigns?campaign='||c.id::text),
    case when private.search_normalize_v217(c.id::text)=i.q then 1000 when private.search_normalize_v217(c.slug)=i.q then 980 when private.search_normalize_v217(c.title)=i.q then 950 when private.search_normalize_v217(c.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label),i.q))::int) end
  from public.campaigns c cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'CAMPAIGN'=any(p_kinds)) and private.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label) like '%'||i.q||'%'
), branch_rows as (
  select 'BRANCH:'||br.id::text,'BRANCH',br.name,coalesce(br.public_description,br.address_line,''),trim(concat_ws(' / ',br.city,br.district)),br.hero_image,case when nullif(br.slug,'') is null then '/branches' else '/branches/'||br.slug end,
    case when private.search_normalize_v217(br.id::text)=i.q then 1000 when private.search_normalize_v217(br.slug)=i.q then 980 when private.search_normalize_v217(br.name)=i.q then 950 when private.search_normalize_v217(br.name) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name),i.q))::int) end
  from public.branches br cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'BRANCH'=any(p_kinds)) and private.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name) like '%'||i.q||'%'
), faq_rows as (
  select 'FAQ:'||f.id::text,'FAQ',f.question,f.answer,coalesce(f.category,'Sık Sorulan Sorular'),null::text,'/faq',case when private.search_normalize_v217(f.question)=i.q then 950 when private.search_normalize_v217(f.question) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(f.id::text,f.question,f.answer,f.category),i.q))::int) end
  from public.faqs f cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'FAQ'=any(p_kinds)) and private.search_join_v217(f.id::text,f.question,f.answer,f.category) like '%'||i.q||'%'
), section_rows as (
  select 'SECTION:'||s.section_key,'SECTION',s.title,coalesce(s.settings->>'description',''),'Ana sayfa bölümü',null::text,coalesce(nullif(s.settings->>'viewAllUrl',''),'/'),case when private.search_normalize_v217(s.title)=i.q then 950 when private.search_normalize_v217(s.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge'),i.q))::int) end
  from public.homepage_sections s cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'SECTION'=any(p_kinds)) and private.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge') like '%'||i.q||'%'
), page_rows as (
  select 'PAGE:'||n.id::text,'PAGE',n.label,'Alperler Rent A Car hizmet sayfası','Hizmet',null::text,n.route,case when private.search_normalize_v217(n.label)=i.q then 950 when private.search_normalize_v217(n.label) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(n.id::text,n.item_key,n.label,n.route),i.q))::int) end
  from public.navigation_items n cross join input i where char_length(i.q)>=2 and (p_kinds is null or 'PAGE'=any(p_kinds)) and private.search_join_v217(n.id::text,n.item_key,n.label,n.route) like '%'||i.q||'%'
), all_rows as (
  select * from vehicle_rows union all select * from tour_rows union all select * from blog_rows union all select * from campaign_rows union all select * from branch_rows union all select * from faq_rows union all select * from section_rows union all select * from page_rows
)
select result_key,kind,title,summary,meta,image,route,score from all_rows,input order by score desc,title asc limit (select lim from input) offset (select off from input);
$$;
revoke all on function public.public_global_search_v217(text,text[],integer,integer) from public;
grant execute on function public.public_global_search_v217(text,text[],integer,integer) to anon,authenticated;

create or replace function public.service_save_footer_bundle_v174(p_actor uuid,p_settings jsonb,p_links jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,auth,pg_catalog as $$
declare v_before_settings jsonb;v_before_links jsonb;v_after_settings jsonb;v_after_links jsonb;v_item jsonb;v_key text;v_group text;v_label text;v_action text;v_route text;v_external text;v_query jsonb;v_actor_email text;
begin
  if not private.can_actor_manage_settings_v174(p_actor) then raise exception using errcode='42501',message='SETTINGS_PERMISSION_REQUIRED';end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception using errcode='22023',message='FOOTER_SETTINGS_REQUIRED';end if;
  if p_links is null or jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>100 then raise exception using errcode='22023',message='FOOTER_LINKS_INVALID';end if;
  select to_jsonb(f) into v_before_settings from public.footer_settings f where config_key='main' for update;
  if v_before_settings is null then raise exception using errcode='P0002',message='FOOTER_SETTINGS_NOT_FOUND';end if;
  update public.footer_settings set
    is_enabled=coalesce((p_settings->>'isEnabled')::boolean,is_enabled),brand_summary=left(coalesce(nullif(btrim(p_settings->>'brandSummary'),''),brand_summary),700),services_title=left(coalesce(nullif(btrim(p_settings->>'servicesTitle'),''),services_title),80),corporate_title=left(coalesce(nullif(btrim(p_settings->>'corporateTitle'),''),corporate_title),80),legal_title=left(coalesce(nullif(btrim(p_settings->>'legalTitle'),''),legal_title),80),newsletter_enabled=coalesce((p_settings->>'newsletterEnabled')::boolean,newsletter_enabled),newsletter_title=left(coalesce(nullif(btrim(p_settings->>'newsletterTitle'),''),newsletter_title),180),newsletter_description=left(coalesce(p_settings->>'newsletterDescription',newsletter_description),500),newsletter_button_text=left(coalesce(nullif(btrim(p_settings->>'newsletterButtonText'),''),newsletter_button_text),80),show_phone=coalesce((p_settings->>'showPhone')::boolean,show_phone),show_whatsapp=coalesce((p_settings->>'showWhatsapp')::boolean,show_whatsapp),show_social=coalesce((p_settings->>'showSocial')::boolean,show_social),show_feedback=coalesce((p_settings->>'showFeedback')::boolean,show_feedback),show_legal_links=coalesce((p_settings->>'showLegalLinks')::boolean,show_legal_links),
    home_label=left(coalesce(nullif(btrim(p_settings->>'homeLabel'),''),home_label),80),contact_label=left(coalesce(nullif(btrim(p_settings->>'contactLabel'),''),contact_label),80),phone_label=left(coalesce(nullif(btrim(p_settings->>'phoneLabel'),''),phone_label),80),whatsapp_label=left(coalesce(nullif(btrim(p_settings->>'whatsappLabel'),''),whatsapp_label),80),default_tagline=left(coalesce(nullif(btrim(p_settings->>'defaultTagline'),''),default_tagline),180),whatsapp_default_message=left(coalesce(nullif(btrim(p_settings->>'whatsappDefaultMessage'),''),whatsapp_default_message),500),legal_more_label=left(coalesce(nullif(btrim(p_settings->>'legalMoreLabel'),''),legal_more_label),120),newsletter_email_label=left(coalesce(nullif(btrim(p_settings->>'newsletterEmailLabel'),''),newsletter_email_label),100),newsletter_email_placeholder=left(coalesce(nullif(btrim(p_settings->>'newsletterEmailPlaceholder'),''),newsletter_email_placeholder),160),newsletter_free_note=left(coalesce(nullif(btrim(p_settings->>'newsletterFreeNote'),''),newsletter_free_note),180),newsletter_legal_label=left(coalesce(nullif(btrim(p_settings->>'newsletterLegalLabel'),''),newsletter_legal_label),180),newsletter_success_message=left(coalesce(nullif(btrim(p_settings->>'newsletterSuccessMessage'),''),newsletter_success_message),220),newsletter_invalid_email_message=left(coalesce(nullif(btrim(p_settings->>'newsletterInvalidEmailMessage'),''),newsletter_invalid_email_message),220),newsletter_error_message=left(coalesce(nullif(btrim(p_settings->>'newsletterErrorMessage'),''),newsletter_error_message),220),copyright_suffix=left(coalesce(nullif(btrim(p_settings->>'copyrightSuffix'),''),copyright_suffix),120),updated_at=now()
  where config_key='main';
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_before_links from public.footer_links l where config_key='main';
  delete from public.footer_links where config_key='main';
  for v_item in select value from jsonb_array_elements(p_links) loop
    v_key=lower(btrim(coalesce(v_item->>'linkKey','')));v_group=upper(btrim(coalesce(v_item->>'groupKey','')));v_label=left(btrim(coalesce(v_item->>'label','')),100);v_action=upper(btrim(coalesce(v_item->>'actionType','ROUTE')));v_route=nullif(left(btrim(coalesce(v_item->>'route','')),300),'');v_external=nullif(left(btrim(coalesce(v_item->>'externalUrl','')),1000),'');v_query=coalesce(v_item->'queryParams','{}'::jsonb);
    if v_key !~ '^[a-z0-9][a-z0-9._-]{0,79}$' or v_group not in ('SERVICES','CORPORATE','LEGAL','BOTTOM') or char_length(v_label)<1 or v_action not in ('ROUTE','LEGAL','FEEDBACK','EXTERNAL','ADMIN') or jsonb_typeof(v_query)<>'object' then raise exception using errcode='22023',message='FOOTER_LINK_INVALID';end if;
    if v_action in ('ROUTE','LEGAL','ADMIN') and (v_route is null or v_route !~ '^/' or v_external is not null) then raise exception using errcode='22023',message='FOOTER_ROUTE_INVALID';end if;
    if v_action='EXTERNAL' and (v_external is null or v_external !~ '^https://' or v_route is not null) then raise exception using errcode='22023',message='FOOTER_EXTERNAL_URL_INVALID';end if;
    if v_action='FEEDBACK' then v_route=null;v_external=null;v_query='{}'::jsonb;end if;
    insert into public.footer_links(link_key,config_key,group_key,label,action_type,route,query_params,external_url,sort_order,is_enabled,opens_new_tab,is_secondary,updated_by,updated_at) values(v_key,'main',v_group,v_label,v_action,v_route,v_query,v_external,greatest(0,least(coalesce((v_item->>'sortOrder')::integer,0),10000)),coalesce((v_item->>'isEnabled')::boolean,true),coalesce((v_item->>'opensNewTab')::boolean,false),coalesce((v_item->>'isSecondary')::boolean,false),p_actor,now());
  end loop;
  select to_jsonb(f) into v_after_settings from public.footer_settings f where config_key='main';select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_after_links from public.footer_links l where config_key='main';select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta) values(p_actor,v_actor_email,'FOOTER_BUNDLE_UPDATED_V217','footer_settings','main',jsonb_build_object('settings',v_before_settings,'links',v_before_links),jsonb_build_object('settings',v_after_settings,'links',v_after_links),jsonb_build_object('gateway','site-content-admin-v174','version','v217'));
  return jsonb_build_object('ok',true,'footerSettings',v_after_settings,'footerLinks',v_after_links);
end;$$;
revoke all on function public.service_save_footer_bundle_v174(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.service_save_footer_bundle_v174(uuid,jsonb,jsonb) to service_role;

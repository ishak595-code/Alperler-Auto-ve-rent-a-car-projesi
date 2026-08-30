-- V217 follow-up: SECURITY INVOKER search must not require USAGE on private schema.
-- These public helpers are pure text functions and expose no table data.

create or replace function public.search_normalize_v217(value text)
returns text language sql immutable parallel safe set search_path=pg_catalog as $$
  select btrim(regexp_replace(translate(lower(coalesce(value,'')),'çğıöşüâîû','cgiosuaiu'),'[^a-z0-9]+',' ','g'));
$$;

create or replace function public.search_join_v217(variadic parts text[])
returns text language sql immutable parallel safe set search_path=pg_catalog,public as $$
  select public.search_normalize_v217(array_to_string(parts,' ',' '));
$$;

grant execute on function public.search_normalize_v217(text) to anon,authenticated;
grant execute on function public.search_join_v217(text[]) to anon,authenticated;

drop index if exists public.vehicles_public_search_trgm_v217;
drop index if exists public.tours_public_search_trgm_v217;
drop index if exists public.blog_posts_public_search_trgm_v217;
drop index if exists public.campaigns_public_search_trgm_v217;
drop index if exists public.branches_public_search_trgm_v217;
drop index if exists public.faqs_public_search_trgm_v217;
drop index if exists public.homepage_sections_public_search_trgm_v217;
drop index if exists public.navigation_items_public_search_trgm_v217;

create index vehicles_public_search_trgm_v217 on public.vehicles using gin (
  public.search_join_v217(id::text,stock_code,brand,model,model_year::text,fuel_type,transmission,body_type,color,engine,location,seo_slug,metadata->>'series',metadata->>'plate',metadata->>'plateNumber',metadata->>'vehicleNumber',metadata->>'vehicleNo',metadata->>'vin',metadata->>'chassisNumber',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;
create index tours_public_search_trgm_v217 on public.tours using gin (
  public.search_join_v217(id::text,title,seo_slug,category,short_description,duration,meeting_point,location_name,metadata->>'badge',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;
create index blog_posts_public_search_trgm_v217 on public.blog_posts using gin (
  public.search_join_v217(id::text,title,slug,excerpt,author_name,seo_title,seo_description,metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where status='PUBLISHED';
create index campaigns_public_search_trgm_v217 on public.campaigns using gin (
  public.search_join_v217(id::text,title,slug,short_description,description,badge,campaign_type,cta_label) extensions.gin_trgm_ops
) where is_active=true;
create index branches_public_search_trgm_v217 on public.branches using gin (
  public.search_join_v217(id::text,name,code,slug,district,city,address_line,territory_label,public_description,operator_display_name,operator_legal_name) extensions.gin_trgm_ops
) where is_active=true;
create index faqs_public_search_trgm_v217 on public.faqs using gin (
  public.search_join_v217(id::text,question,answer,category) extensions.gin_trgm_ops
) where is_active=true;
create index homepage_sections_public_search_trgm_v217 on public.homepage_sections using gin (
  public.search_join_v217(section_key,title,settings->>'description',settings->>'badge') extensions.gin_trgm_ops
) where is_enabled=true;
create index navigation_items_public_search_trgm_v217 on public.navigation_items using gin (
  public.search_join_v217(id::text,item_key,label,route) extensions.gin_trgm_ops
) where is_active=true and archived_at is null;

create or replace function public.public_global_search_v217(
  p_query text,p_kinds text[] default null,p_limit integer default 40,p_offset integer default 0
)
returns table(result_key text,kind text,title text,summary text,meta text,image text,route text,score integer)
language plpgsql stable security invoker set search_path=pg_catalog,public,extensions as $$
declare
  v_q text:=public.search_normalize_v217(left(coalesce(p_query,''),120));
  v_limit integer:=greatest(1,least(coalesce(p_limit,40),100));
  v_offset integer:=greatest(0,least(coalesce(p_offset,0),1000000));
begin
  if char_length(v_q)<2 then return;end if;
  return query
  with vehicle_rows as (
    select 'VEHICLE:'||v.id::text,case when v.category='SALE' then 'SALE' else 'RENTAL' end,trim(concat_ws(' ',v.brand,v.model,v.model_year::text)),coalesce(v.description,v.location,''),trim(concat_ws(' · ',v.model_year::text,v.transmission,v.fuel_type,v.location)),coalesce(nullif(v.cover_image,''),nullif(v.images->>0,'')),(case when v.category='SALE' then '/sales/' else '/fleet/' end)||coalesce(nullif(v.seo_slug,''),v.id::text),case when public.search_normalize_v217(v.id::text)=v_q then 1000 when public.search_normalize_v217(v.stock_code)=v_q then 990 when public.search_normalize_v217(v.seo_slug)=v_q then 980 when public.search_join_v217(v.brand,v.model,v.model_year::text)=v_q then 950 when public.search_normalize_v217(v.stock_code) like v_q||'%' then 920 when public.search_join_v217(v.brand,v.model,v.model_year::text) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id'),v_q))::int) end from public.vehicles v where (p_kinds is null or (case when v.category='SALE' then 'SALE' else 'RENTAL' end)=any(p_kinds)) and public.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id') like '%'||v_q||'%'
  ),
  tour_rows as (select 'TOUR:'||t.id::text,'TOUR',t.title,coalesce(t.short_description,t.description,''),trim(concat_ws(' · ',t.duration,t.location_name)),t.cover_image,'/tour/'||coalesce(nullif(t.seo_slug,''),t.id::text),case when public.search_normalize_v217(t.id::text)=v_q then 1000 when public.search_normalize_v217(t.seo_slug)=v_q then 980 when public.search_normalize_v217(t.title)=v_q then 950 when public.search_normalize_v217(t.title) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id'),v_q))::int) end from public.tours t where (p_kinds is null or 'TOUR'=any(p_kinds)) and public.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id') like '%'||v_q||'%'),
  blog_rows as (select 'BLOG:'||b.id::text,'BLOG',b.title,coalesce(b.excerpt,''),coalesce(b.author_name,'Blog'),b.cover_image,'/blog/'||coalesce(nullif(b.slug,''),b.id::text),case when public.search_normalize_v217(b.id::text)=v_q then 1000 when public.search_normalize_v217(b.slug)=v_q then 980 when public.search_normalize_v217(b.title)=v_q then 950 when public.search_normalize_v217(b.title) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id'),v_q))::int) end from public.blog_posts b where (p_kinds is null or 'BLOG'=any(p_kinds)) and public.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id') like '%'||v_q||'%'),
  campaign_rows as (select 'CAMPAIGN:'||c.id::text,'CAMPAIGN',c.title,coalesce(c.short_description,c.description,''),coalesce(c.badge,'Kampanya'),c.cover_image,coalesce(nullif(c.cta_url,''),'/campaigns?campaign='||c.id::text),case when public.search_normalize_v217(c.id::text)=v_q then 1000 when public.search_normalize_v217(c.slug)=v_q then 980 when public.search_normalize_v217(c.title)=v_q then 950 when public.search_normalize_v217(c.title) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label),v_q))::int) end from public.campaigns c where (p_kinds is null or 'CAMPAIGN'=any(p_kinds)) and public.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label) like '%'||v_q||'%'),
  branch_rows as (select 'BRANCH:'||br.id::text,'BRANCH',br.name,coalesce(br.public_description,br.address_line,''),trim(concat_ws(' / ',br.city,br.district)),br.hero_image,case when nullif(br.slug,'') is null then '/branches' else '/branches/'||br.slug end,case when public.search_normalize_v217(br.id::text)=v_q then 1000 when public.search_normalize_v217(br.slug)=v_q then 980 when public.search_normalize_v217(br.name)=v_q then 950 when public.search_normalize_v217(br.name) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name),v_q))::int) end from public.branches br where (p_kinds is null or 'BRANCH'=any(p_kinds)) and public.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name) like '%'||v_q||'%'),
  faq_rows as (select 'FAQ:'||f.id::text,'FAQ',f.question,f.answer,coalesce(f.category,'Sık Sorulan Sorular'),null::text,'/faq',case when public.search_normalize_v217(f.question)=v_q then 950 when public.search_normalize_v217(f.question) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(f.id::text,f.question,f.answer,f.category),v_q))::int) end from public.faqs f where (p_kinds is null or 'FAQ'=any(p_kinds)) and public.search_join_v217(f.id::text,f.question,f.answer,f.category) like '%'||v_q||'%'),
  section_rows as (select 'SECTION:'||s.section_key,'SECTION',s.title,coalesce(s.settings->>'description',''),'Ana sayfa bölümü',null::text,coalesce(nullif(s.settings->>'viewAllUrl',''),'/'),case when public.search_normalize_v217(s.title)=v_q then 950 when public.search_normalize_v217(s.title) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge'),v_q))::int) end from public.homepage_sections s where (p_kinds is null or 'SECTION'=any(p_kinds)) and public.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge') like '%'||v_q||'%'),
  page_rows as (select 'PAGE:'||n.id::text,'PAGE',n.label,'Alperler Rent A Car hizmet sayfası','Hizmet',null::text,n.route,case when public.search_normalize_v217(n.label)=v_q then 950 when public.search_normalize_v217(n.label) like v_q||'%' then 850 else 500+least(300,round(300*similarity(public.search_join_v217(n.id::text,n.item_key,n.label,n.route),v_q))::int) end from public.navigation_items n where (p_kinds is null or 'PAGE'=any(p_kinds)) and public.search_join_v217(n.id::text,n.item_key,n.label,n.route) like '%'||v_q||'%'),
  all_rows(result_key,kind,title,summary,meta,image,route,score) as (select * from vehicle_rows union all select * from tour_rows union all select * from blog_rows union all select * from campaign_rows union all select * from branch_rows union all select * from faq_rows union all select * from section_rows union all select * from page_rows)
  select a.result_key,a.kind,a.title,a.summary,a.meta,a.image,a.route,a.score from all_rows a order by a.score desc,a.title asc limit v_limit offset v_offset;
end;$$;

revoke all on function public.public_global_search_v217(text,text[],integer,integer) from public;
grant execute on function public.public_global_search_v217(text,text[],integer,integer) to anon,authenticated;

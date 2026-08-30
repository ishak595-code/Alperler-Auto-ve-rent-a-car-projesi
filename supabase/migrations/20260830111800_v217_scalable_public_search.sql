-- V217 indexed server-side search. SECURITY INVOKER preserves every table's existing RLS.

create extension if not exists pg_trgm with schema extensions;

create or replace function private.search_normalize_v217(value text)
returns text
language sql
immutable
parallel safe
set search_path=pg_catalog
as $$
  select btrim(regexp_replace(translate(lower(coalesce(value,'')),'çğıöşüâîû','cgiosuaiu'),'[^a-z0-9]+',' ','g'));
$$;

create or replace function private.search_join_v217(variadic parts text[])
returns text
language sql
immutable
parallel safe
set search_path=pg_catalog,private
as $$
  select private.search_normalize_v217(array_to_string(parts,' ',' '));
$$;

revoke all on function private.search_normalize_v217(text) from public,anon,authenticated;
revoke all on function private.search_join_v217(text[]) from public,anon,authenticated;

create index if not exists vehicles_public_search_trgm_v217
on public.vehicles using gin (
  private.search_join_v217(id::text,stock_code,brand,model,model_year::text,fuel_type,transmission,body_type,color,engine,location,seo_slug,
    metadata->>'series',metadata->>'plate',metadata->>'plateNumber',metadata->>'vehicleNumber',metadata->>'vehicleNo',metadata->>'vin',metadata->>'chassisNumber',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;

create index if not exists tours_public_search_trgm_v217
on public.tours using gin (
  private.search_join_v217(id::text,title,seo_slug,category,short_description,duration,meeting_point,location_name,metadata->>'badge',metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where is_active=true;

create index if not exists blog_posts_public_search_trgm_v217
on public.blog_posts using gin (
  private.search_join_v217(id::text,title,slug,excerpt,author_name,seo_title,seo_description,metadata->>'legacyId',metadata->>'legacy_id') extensions.gin_trgm_ops
) where status='PUBLISHED';

create index if not exists campaigns_public_search_trgm_v217
on public.campaigns using gin (
  private.search_join_v217(id::text,title,slug,short_description,description,badge,campaign_type,cta_label) extensions.gin_trgm_ops
) where is_active=true;

create index if not exists branches_public_search_trgm_v217
on public.branches using gin (
  private.search_join_v217(id::text,name,code,slug,district,city,address_line,territory_label,public_description,operator_display_name,operator_legal_name) extensions.gin_trgm_ops
) where is_active=true;

create index if not exists faqs_public_search_trgm_v217
on public.faqs using gin (
  private.search_join_v217(id::text,question,answer,category) extensions.gin_trgm_ops
) where is_active=true;

create index if not exists homepage_sections_public_search_trgm_v217
on public.homepage_sections using gin (
  private.search_join_v217(section_key,title,settings->>'description',settings->>'badge') extensions.gin_trgm_ops
) where is_enabled=true;

create index if not exists navigation_items_public_search_trgm_v217
on public.navigation_items using gin (
  private.search_join_v217(id::text,item_key,label,route) extensions.gin_trgm_ops
) where is_active=true and archived_at is null;

create or replace function public.public_global_search_v217(
  p_query text,
  p_kinds text[] default null,
  p_limit integer default 40,
  p_offset integer default 0
)
returns table(result_key text,kind text,title text,summary text,meta text,image text,route text,score integer)
language sql
stable
security invoker
set search_path=pg_catalog,public,private,extensions
as $$
with input as (
  select private.search_normalize_v217(left(coalesce(p_query,''),120)) q,
         greatest(1,least(coalesce(p_limit,40),100)) lim,
         greatest(0,least(coalesce(p_offset,0),1000000)) off
),
vehicle_rows as (
  select 'VEHICLE:'||v.id::text,case when v.category='SALE' then 'SALE' else 'RENTAL' end,
    trim(concat_ws(' ',v.brand,v.model,v.model_year::text)),coalesce(v.description,v.location,''),
    trim(concat_ws(' · ',v.model_year::text,v.transmission,v.fuel_type,v.location)),coalesce(nullif(v.cover_image,''),nullif(v.images->>0,'')),
    (case when v.category='SALE' then '/sales/' else '/fleet/' end)||coalesce(nullif(v.seo_slug,''),v.id::text),
    case when private.search_normalize_v217(v.id::text)=i.q then 1000
         when private.search_normalize_v217(v.stock_code)=i.q then 990
         when private.search_normalize_v217(v.seo_slug)=i.q then 980
         when private.search_join_v217(v.brand,v.model,v.model_year::text)=i.q then 950
         when private.search_normalize_v217(v.stock_code) like i.q||'%' then 920
         when private.search_join_v217(v.brand,v.model,v.model_year::text) like i.q||'%' then 850
         else 500+least(300,round(300*similarity(private.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id'),i.q))::int) end
  from public.vehicles v cross join input i
  where char_length(i.q)>=2
    and (p_kinds is null or (case when v.category='SALE' then 'SALE' else 'RENTAL' end)=any(p_kinds))
    and private.search_join_v217(v.id::text,v.stock_code,v.brand,v.model,v.model_year::text,v.fuel_type,v.transmission,v.body_type,v.color,v.engine,v.location,v.seo_slug,v.metadata->>'series',v.metadata->>'plate',v.metadata->>'plateNumber',v.metadata->>'vehicleNumber',v.metadata->>'vehicleNo',v.metadata->>'vin',v.metadata->>'chassisNumber',v.metadata->>'legacyId',v.metadata->>'legacy_id') like '%'||i.q||'%'
),
tour_rows as (
  select 'TOUR:'||t.id::text,'TOUR',t.title,coalesce(t.short_description,t.description,''),trim(concat_ws(' · ',t.duration,t.location_name)),t.cover_image,
    '/tour/'||coalesce(nullif(t.seo_slug,''),t.id::text),
    case when private.search_normalize_v217(t.id::text)=i.q then 1000 when private.search_normalize_v217(t.seo_slug)=i.q then 980 when private.search_normalize_v217(t.title)=i.q then 950 when private.search_normalize_v217(t.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id'),i.q))::int) end
  from public.tours t cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'TOUR'=any(p_kinds))
    and private.search_join_v217(t.id::text,t.title,t.seo_slug,t.category,t.short_description,t.duration,t.meeting_point,t.location_name,t.metadata->>'badge',t.metadata->>'legacyId',t.metadata->>'legacy_id') like '%'||i.q||'%'
),
blog_rows as (
  select 'BLOG:'||b.id::text,'BLOG',b.title,coalesce(b.excerpt,''),coalesce(b.author_name,'Blog'),b.cover_image,'/blog/'||coalesce(nullif(b.slug,''),b.id::text),
    case when private.search_normalize_v217(b.id::text)=i.q then 1000 when private.search_normalize_v217(b.slug)=i.q then 980 when private.search_normalize_v217(b.title)=i.q then 950 when private.search_normalize_v217(b.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id'),i.q))::int) end
  from public.blog_posts b cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'BLOG'=any(p_kinds))
    and private.search_join_v217(b.id::text,b.title,b.slug,b.excerpt,b.author_name,b.seo_title,b.seo_description,b.metadata->>'legacyId',b.metadata->>'legacy_id') like '%'||i.q||'%'
),
campaign_rows as (
  select 'CAMPAIGN:'||c.id::text,'CAMPAIGN',c.title,coalesce(c.short_description,c.description,''),coalesce(c.badge,'Kampanya'),c.cover_image,
    coalesce(nullif(c.cta_url,''),'/campaigns?campaign='||c.id::text),
    case when private.search_normalize_v217(c.id::text)=i.q then 1000 when private.search_normalize_v217(c.slug)=i.q then 980 when private.search_normalize_v217(c.title)=i.q then 950 when private.search_normalize_v217(c.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label),i.q))::int) end
  from public.campaigns c cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'CAMPAIGN'=any(p_kinds))
    and private.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label) like '%'||i.q||'%'
),
branch_rows as (
  select 'BRANCH:'||br.id::text,'BRANCH',br.name,coalesce(br.public_description,br.address_line,''),trim(concat_ws(' / ',br.city,br.district)),br.hero_image,
    case when nullif(br.slug,'') is null then '/branches' else '/branches/'||br.slug end,
    case when private.search_normalize_v217(br.id::text)=i.q then 1000 when private.search_normalize_v217(br.slug)=i.q then 980 when private.search_normalize_v217(br.name)=i.q then 950 when private.search_normalize_v217(br.name) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name),i.q))::int) end
  from public.branches br cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'BRANCH'=any(p_kinds))
    and private.search_join_v217(br.id::text,br.name,br.code,br.slug,br.district,br.city,br.address_line,br.territory_label,br.public_description,br.operator_display_name,br.operator_legal_name) like '%'||i.q||'%'
),
faq_rows as (
  select 'FAQ:'||f.id::text,'FAQ',f.question,f.answer,coalesce(f.category,'Sık Sorulan Sorular'),null::text,'/faq',
    case when private.search_normalize_v217(f.question)=i.q then 950 when private.search_normalize_v217(f.question) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(f.id::text,f.question,f.answer,f.category),i.q))::int) end
  from public.faqs f cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'FAQ'=any(p_kinds))
    and private.search_join_v217(f.id::text,f.question,f.answer,f.category) like '%'||i.q||'%'
),
section_rows as (
  select 'SECTION:'||s.section_key,'SECTION',s.title,coalesce(s.settings->>'description',''),'Ana sayfa bölümü',null::text,
    coalesce(nullif(s.settings->>'viewAllUrl',''),'/'),
    case when private.search_normalize_v217(s.title)=i.q then 950 when private.search_normalize_v217(s.title) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge'),i.q))::int) end
  from public.homepage_sections s cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'SECTION'=any(p_kinds))
    and private.search_join_v217(s.section_key,s.title,s.settings->>'description',s.settings->>'badge') like '%'||i.q||'%'
),
page_rows as (
  select 'PAGE:'||n.id::text,'PAGE',n.label,'Alperler Rent A Car hizmet sayfası','Hizmet',null::text,n.route,
    case when private.search_normalize_v217(n.label)=i.q then 950 when private.search_normalize_v217(n.label) like i.q||'%' then 850 else 500+least(300,round(300*similarity(private.search_join_v217(n.id::text,n.item_key,n.label,n.route),i.q))::int) end
  from public.navigation_items n cross join input i
  where char_length(i.q)>=2 and (p_kinds is null or 'PAGE'=any(p_kinds))
    and private.search_join_v217(n.id::text,n.item_key,n.label,n.route) like '%'||i.q||'%'
),
all_rows(result_key,kind,title,summary,meta,image,route,score) as (
  select * from vehicle_rows union all select * from tour_rows union all select * from blog_rows union all select * from campaign_rows union all select * from branch_rows union all select * from faq_rows union all select * from section_rows union all select * from page_rows
)
select a.result_key,a.kind,a.title,a.summary,a.meta,a.image,a.route,a.score
from all_rows a cross join input i
order by a.score desc,a.title asc
limit i.lim offset i.off;
$$;

revoke all on function public.public_global_search_v217(text,text[],integer,integer) from public;
grant execute on function public.public_global_search_v217(text,text[],integer,integer) to anon,authenticated;

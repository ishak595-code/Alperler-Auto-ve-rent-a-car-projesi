with canonical(surface,item_key,label,icon,route,sort_order) as (
  values
    ('MOBILE_DOCK'::text,'fleet'::text,'Kiralık'::text,'key'::text,'/fleet'::text,10),
    ('MOBILE_DOCK','sales','Satılık','directions_car','/sales',20),
    ('MOBILE_DOCK','search','Ara','search','/search',30),
    ('MOBILE_DOCK','campaigns','Fırsatlar','local_offer','/campaigns',40),
    ('MOBILE_DOCK','account','Profil','account_circle','/account',50)
)
insert into public.navigation_items(surface,item_key,label,icon,route,sort_order,is_active,archived_at,metadata)
select surface,item_key,label,icon,route,sort_order,true,null,'{}'::jsonb from canonical
on conflict (surface,item_key) do update
set label=excluded.label,
    icon=excluded.icon,
    route=excluded.route,
    sort_order=excluded.sort_order,
    is_active=true,
    archived_at=null,
    updated_at=now();

update public.navigation_items
set is_active=false,
    archived_at=coalesce(archived_at,now()),
    updated_at=now()
where surface='MOBILE_DOCK'
  and item_key not in ('fleet','sales','search','campaigns','account')
  and (is_active=true or archived_at is null);

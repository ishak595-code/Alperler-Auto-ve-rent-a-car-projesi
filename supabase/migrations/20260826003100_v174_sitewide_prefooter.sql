-- V174 site-wide pre-footer. The pre-footer belongs to the customer shell, not the homepage renderer.

delete from public.homepage_sections
where section_key='prefooter_action' and coalesce(settings->>'renderer','')='PREFOOTER';

create table if not exists public.prefooter_settings (
  config_key text primary key default 'main',
  is_enabled boolean not null default true,
  badge text not null default 'Size Uygun Sonraki Adım',
  title text not null default 'Planınızı Birlikte Netleştirelim',
  description text not null default '',
  primary_label text not null default 'Bize Ulaşın',
  primary_route text not null default '/contact',
  secondary_label text not null default 'Randevu Oluştur',
  secondary_route text not null default '/appointment',
  trust_items jsonb not null default '[]'::jsonb,
  show_on_home boolean not null default true,
  show_on_inner boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint prefooter_key_check check (config_key='main'),
  constraint prefooter_routes_check check (primary_route ~ '^/' and secondary_route ~ '^/'),
  constraint prefooter_trust_array_check check (jsonb_typeof(trust_items)='array')
);

alter table public.prefooter_settings enable row level security;
drop policy if exists prefooter_settings_public_read_v174 on public.prefooter_settings;
create policy prefooter_settings_public_read_v174 on public.prefooter_settings for select to anon,authenticated using(config_key='main');
revoke all on table public.prefooter_settings from public,anon,authenticated;
grant select on table public.prefooter_settings to anon,authenticated;
grant all on table public.prefooter_settings to service_role;

insert into public.prefooter_settings(config_key,is_enabled,badge,title,description,primary_label,primary_route,secondary_label,secondary_route,trust_items,show_on_home,show_on_inner)
values('main',true,'Size Uygun Sonraki Adım','Planınızı Birlikte Netleştirelim','Araç kiralama, ikinci el araç, tur, transfer, randevu veya aracınızı değerlendirme konusunda hangi adımın size uygun olduğunu birlikte netleştirin.','Bize Ulaşın','/contact','Randevu Oluştur','/appointment',jsonb_build_array('Kiralama, satış, tur ve transfer tek ekipte','WhatsApp ve telefon desteği','İçerikler canlı katalog ve şube verisinden gelir'),true,true)
on conflict(config_key) do nothing;

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='prefooter_settings') then
    alter publication supabase_realtime add table public.prefooter_settings;
  end if;
end $$;

create or replace function public.service_site_content_snapshot_v174(p_actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_footer jsonb;v_links jsonb;v_prefooter jsonb;v_sections jsonb;v_placements jsonb;
begin
  if not (private.can_actor_manage_content_v174(p_actor) or private.can_actor_manage_settings_v174(p_actor)) then raise exception using errcode='42501',message='SITE_CONTENT_PERMISSION_REQUIRED'; end if;
  select to_jsonb(f) into v_footer from public.footer_settings f where f.config_key='main';
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb) into v_links from public.footer_links l where l.config_key='main';
  select to_jsonb(p) into v_prefooter from public.prefooter_settings p where p.config_key='main';
  select coalesce(jsonb_agg(to_jsonb(s) order by s.sort_order,s.section_key),'[]'::jsonb) into v_sections from public.homepage_sections s;
  select coalesce(jsonb_agg(to_jsonb(h) order by h.section_key,h.sort_order,h.id),'[]'::jsonb) into v_placements from public.homepage_placements h;
  return jsonb_build_object('ok',true,'footerSettings',v_footer,'footerLinks',v_links,'prefooterSettings',v_prefooter,'homepageSections',v_sections,'homepagePlacements',v_placements);
end;
$$;
revoke all on function public.service_site_content_snapshot_v174(uuid) from public,anon,authenticated;
grant execute on function public.service_site_content_snapshot_v174(uuid) to service_role;

create or replace function public.service_save_prefooter_v174(p_actor uuid,p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare v_before jsonb;v_after public.prefooter_settings%rowtype;v_trust jsonb;v_actor_email text;v_primary text;v_secondary text;
begin
  if not private.can_actor_manage_settings_v174(p_actor) then raise exception using errcode='42501',message='SETTINGS_PERMISSION_REQUIRED'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception using errcode='22023',message='PREFOOTER_SETTINGS_REQUIRED'; end if;
  v_trust=coalesce(p_settings->'trustItems','[]'::jsonb);
  if jsonb_typeof(v_trust)<>'array' or jsonb_array_length(v_trust)>6 then raise exception using errcode='22023',message='PREFOOTER_TRUST_ITEMS_INVALID'; end if;
  v_primary=left(btrim(coalesce(p_settings->>'primaryRoute','')),300);v_secondary=left(btrim(coalesce(p_settings->>'secondaryRoute','')),300);
  if v_primary !~ '^/' or v_secondary !~ '^/' then raise exception using errcode='22023',message='PREFOOTER_ROUTE_INVALID'; end if;
  select to_jsonb(p) into v_before from public.prefooter_settings p where config_key='main' for update;
  insert into public.prefooter_settings(config_key,is_enabled,badge,title,description,primary_label,primary_route,secondary_label,secondary_route,trust_items,show_on_home,show_on_inner,updated_by,updated_at)
  values('main',coalesce((p_settings->>'isEnabled')::boolean,true),left(btrim(coalesce(p_settings->>'badge','')),100),left(btrim(coalesce(p_settings->>'title','')),180),left(btrim(coalesce(p_settings->>'description','')),700),left(btrim(coalesce(p_settings->>'primaryLabel','')),100),v_primary,left(btrim(coalesce(p_settings->>'secondaryLabel','')),100),v_secondary,v_trust,coalesce((p_settings->>'showOnHome')::boolean,true),coalesce((p_settings->>'showOnInner')::boolean,true),p_actor,now())
  on conflict(config_key) do update set is_enabled=excluded.is_enabled,badge=excluded.badge,title=excluded.title,description=excluded.description,primary_label=excluded.primary_label,primary_route=excluded.primary_route,secondary_label=excluded.secondary_label,secondary_route=excluded.secondary_route,trust_items=excluded.trust_items,show_on_home=excluded.show_on_home,show_on_inner=excluded.show_on_inner,updated_by=p_actor,updated_at=now()
  returning * into v_after;
  if char_length(v_after.title)<1 or char_length(v_after.primary_label)<1 then raise exception using errcode='22023',message='PREFOOTER_COPY_REQUIRED'; end if;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'PREFOOTER_UPDATED_V174','prefooter_settings','main',v_before,to_jsonb(v_after),jsonb_build_object('gateway','site-content-admin-v174'));
  return jsonb_build_object('ok',true,'prefooterSettings',to_jsonb(v_after));
end;
$$;
revoke all on function public.service_save_prefooter_v174(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_save_prefooter_v174(uuid,jsonb) to service_role;

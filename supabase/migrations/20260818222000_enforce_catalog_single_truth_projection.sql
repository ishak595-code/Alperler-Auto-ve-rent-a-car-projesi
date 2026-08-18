create or replace function public.sanitize_catalog_owner_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    - array[
      'image','images','gallery','videos','cover_image',
      'brand','model','year','model_year','price','rental_price_daily','km','mileage_km',
      'fuel','fuel_type','transmission','type','body_type','color','engineVolume','engine','seats',
      'location','description','features','isFeatured','is_featured','isAvailable','availability','availability_status',
      'category','cloudId','cloudStockCode','stock_code','publicationStatus','publication_status','publishedAt','published_at',
      'scheduledAt','scheduled_at','branchId','branch_id','listingOrigin','listing_origin','createdAt','created_at','updatedAt','updated_at',
      'title','shortDescription','short_description','duration','capacity','meetingPoint','meeting_point','itinerary',
      'includedItems','included_items','excludedItems','excluded_items','price_per_person','cloudSlug','seo_slug'
    ];
  return new;
end;
$$;

drop trigger if exists trg_vehicle_metadata_single_truth on public.vehicles;
create trigger trg_vehicle_metadata_single_truth
before insert or update on public.vehicles
for each row execute function public.sanitize_catalog_owner_metadata();

drop trigger if exists trg_tour_metadata_single_truth on public.tours;
create trigger trg_tour_metadata_single_truth
before insert or update on public.tours
for each row execute function public.sanitize_catalog_owner_metadata();

create or replace function public.restore_catalog_media_projection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_table_name = 'vehicles' then
    perform public.sync_catalog_owner_media(new.id, null);
  elsif tg_table_name = 'tours' then
    perform public.sync_catalog_owner_media(null, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicle_media_projection_guard on public.vehicles;
create trigger trg_vehicle_media_projection_guard
after insert or update on public.vehicles
for each row execute function public.restore_catalog_media_projection();

drop trigger if exists trg_tour_media_projection_guard on public.tours;
create trigger trg_tour_media_projection_guard
after insert or update on public.tours
for each row execute function public.restore_catalog_media_projection();

update public.vehicles set metadata = metadata;
update public.tours set metadata = metadata;

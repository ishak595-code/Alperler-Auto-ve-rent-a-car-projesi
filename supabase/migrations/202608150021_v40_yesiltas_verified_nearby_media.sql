-- V40: Replace the generic Yüksekova image used by the Yeşiltaş eco-camp tour
-- with a reusable, geospatially verified nearby landscape.
-- Source: Wikimedia Commons File:Doski_Vadisi.jpg, CC BY-SA 4.0, Emir doski.
-- Location verification: Doski Vadisi is approximately 3 km east of Yeşiltaş.

do $$
declare
  v_tour_id uuid;
  v_media_url text := 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Doski_Vadisi.jpg?width=1600';
begin
  select id
    into v_tour_id
  from public.tours
  where title = 'Yeşiltaş Köyü Ekolojik Doğa Kampı'
  limit 1;

  if v_tour_id is null then
    raise exception 'Yeşiltaş Köyü Ekolojik Doğa Kampı tour not found';
  end if;

  update public.catalog_media
  set external_url = v_media_url,
      source_url = 'https://commons.wikimedia.org/wiki/File:Doski_Vadisi.jpg',
      source_name = 'Wikimedia Commons',
      license = 'CC BY-SA 4.0',
      attribution = 'Emir doski',
      alt_text = 'Yeşiltaş’ın yaklaşık 3 km doğusundaki Doski Vadisi',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'verification_status', 'NEARBY_LOCATION_VERIFIED',
        'verification_note', 'Doski Vadisi is approximately 3 km east of Yeşiltaş; used as a truthful nearby-landscape image, not as a photo taken inside the village.'
      ),
      updated_at = now()
  where tour_id = v_tour_id
    and kind = 'IMAGE'
    and is_active = true
    and (
      external_url like '%Y%C3%BCksekova%203.jpg%'
      or external_url like '%Yüksekova%203.jpg%'
      or alt_text ilike '%temsili%'
    );

  if not found then
    raise exception 'Expected generic Yeşiltaş media row not found';
  end if;

  update public.tours
  set cover_image = v_media_url,
      images = jsonb_build_array(v_media_url),
      updated_at = now()
  where id = v_tour_id;
end $$;

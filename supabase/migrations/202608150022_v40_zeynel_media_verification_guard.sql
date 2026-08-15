-- V40: The current Zeynel Bey Medresesi image is a Hakkari city context image,
-- not a verified photograph of the monument itself. Preserve the tour card while
-- explicitly recording that an exact reusable monument photograph is still needed.
-- This prevents future admin/editor tooling from treating the representative image
-- as an exact-location verified asset.

do $$
declare
  v_tour_id uuid;
begin
  select id
    into v_tour_id
  from public.tours
  where title = 'Zeynel Bey Medresesi & Sınır Boyları Moto-Turu'
    and location_name = 'Biçer Mahallesi, Hakkari Merkez'
  limit 1;

  if v_tour_id is null then
    raise exception 'Zeynel Bey Medresesi tour not found';
  end if;

  update public.catalog_media
  set alt_text = 'Hakkari şehir görünümü; Zeynel Bey Medresesi için temsili bölge görseli',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'verification_status', 'PENDING_EXACT_LICENSED_MEDIA',
        'verification_note', 'Do not present this asset as an exact photograph of Zeynel Bey Medresesi. Replace it when an exact monument image with confirmed reuse rights is available.',
        'official_location_source', 'Hakkari İl Kültür ve Turizm Müdürlüğü'
      ),
      updated_at = now()
  where tour_id = v_tour_id
    and kind = 'IMAGE'
    and is_active = true;

  if not found then
    raise exception 'Active Zeynel Bey Medresesi media row not found';
  end if;
end $$;

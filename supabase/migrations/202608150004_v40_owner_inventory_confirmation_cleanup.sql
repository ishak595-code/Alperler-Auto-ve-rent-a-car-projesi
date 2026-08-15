-- The catalog records are owner-confirmed real inventory.
-- Keep external media source/license provenance in the backend without
-- exposing representation labels in the customer-facing catalog.

update public.vehicles
set actual_vehicle_verified = true,
    metadata = (coalesce(metadata,'{}'::jsonb)
      - 'physicalUnitVerification'
      - 'mediaRepresentation'
      - 'verificationNote')
      || jsonb_build_object('inventoryOwnership','OWNER_CONFIRMED'),
    updated_at = now()
where stock_code like 'LEGACY-%';

update public.catalog_media
set metadata = coalesce(metadata,'{}'::jsonb)
      - 'mediaScope'
      - 'verifiedModelFamily'
      - 'verifiedModel'
      - 'verifiedMediaYear'
      - 'verifiedYear'
      - 'powertrainVariant'
      - 'decorationShown'
      - 'vipInteriorShown',
    alt_text = replace(replace(replace(replace(alt_text,
      ' temsili model ailesi görseli',''),
      ' temsili model görseli',''),
      ' temsili görünümü',''),
      ' temsili model ailesi görünümü',''),
    updated_at = now()
where vehicle_id is not null;

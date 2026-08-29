-- V208.3 server-only boundary contract.
-- These objects are intentionally unavailable to anon/authenticated direct Data API use.

DO $$
DECLARE
  v_object record;
  v_privilege text;
  v_oid oid;
  v_table_objects text[][] := ARRAY[
    ARRAY['private','partner_request_vehicle_identity'],
    ARRAY['private','vehicle_registry'],
    ARRAY['public','commercial_offer_quotes'],
    ARRAY['public','media_cleanup_jobs_v198'],
    ARRAY['public','newsletter_campaigns'],
    ARRAY['public','newsletter_deliveries'],
    ARRAY['public','subscribers'],
    ARRAY['public','system_events']
  ];
  v_privileges text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'];
  v_functions text[] := ARRAY[
    'reserve_booking_commercial_offer',
    'service_newsletter_admin_snapshot_v186',
    'service_attach_partner_request_identity_v172',
    'service_partner_request_admin_snapshot_v172',
    'service_upsert_partner_request_identity_v172',
    'ingest_system_event',
    'service_set_system_event_resolved_v176',
    'service_system_health_snapshot_v176',
    'service_search_vehicle_registry_v177',
    'service_upsert_vehicle_registry_v177'
  ];
  v_fn text;
  v_pair text[];
BEGIN
  FOREACH v_pair SLICE 1 IN ARRAY v_table_objects LOOP
    FOREACH v_privilege IN ARRAY v_privileges LOOP
      IF has_table_privilege('anon', format('%I.%I', v_pair[1], v_pair[2]), v_privilege) THEN
        RAISE EXCEPTION 'V2083 boundary failed: anon retains % on %.%', v_privilege, v_pair[1], v_pair[2];
      END IF;
      IF has_table_privilege('authenticated', format('%I.%I', v_pair[1], v_pair[2]), v_privilege) THEN
        RAISE EXCEPTION 'V2083 boundary failed: authenticated retains % on %.%', v_privilege, v_pair[1], v_pair[2];
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v_fn IN ARRAY v_functions LOOP
    SELECT p.oid
      INTO v_oid
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = v_fn
       AND p.prosecdef = true
     ORDER BY p.oid
     LIMIT 1;

    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'V2083 boundary failed: expected privileged routine public.% is missing', v_fn;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'V2083 boundary failed: anon can execute public.%', v_fn;
    END IF;
    IF has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'V2083 boundary failed: authenticated can execute public.%', v_fn;
    END IF;
    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'V2083 boundary failed: service_role cannot execute public.%', v_fn;
    END IF;
    v_oid := NULL;
  END LOOP;
END;
$$;

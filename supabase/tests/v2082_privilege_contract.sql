-- V208.2 production privilege contract.
-- Run after applying 20260829203000_v2082_architecture_constitution_privilege_hardening.sql.

DO $$
DECLARE
  v_table text;
  v_privilege text;
  v_tables text[] := ARRAY[
    'admin_user_branches', 'audit_logs', 'contact_messages', 'customer_documents',
    'customer_loyalty_ledger', 'customer_payment_methods', 'customer_referral_codes',
    'customer_referral_rewards', 'customer_referrals', 'customer_vault_consents',
    'customer_vault_terms', 'geo_districts', 'geo_provinces', 'media_assets',
    'newsletter_consent_events', 'notification_deliveries', 'partner_requests',
    'payment_transactions', 'staff_branch_assignments', 'staff_profiles',
    'tour_staff_assignments', 'vehicle_inspections', 'vehicle_staff_assignments'
  ];
  v_privileges text[] := ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    FOREACH v_privilege IN ARRAY v_privileges LOOP
      IF has_table_privilege('anon', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'V2082 privilege contract failed: anon retains % on public.%', v_privilege, v_table;
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'service_admin_audit_snapshot_v2082'
  ) THEN
    RAISE EXCEPTION 'V2082 privilege contract failed: privileged audit RPC must not exist in exposed public schema';
  END IF;
END;
$$;

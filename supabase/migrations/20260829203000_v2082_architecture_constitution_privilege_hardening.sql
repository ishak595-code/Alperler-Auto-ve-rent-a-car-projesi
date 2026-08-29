-- V208.2 Architecture Constitution
-- Anonymous clients keep only explicitly intended table privileges. Privileged
-- audit reads are authorized inside the server-side admin-core Edge Function;
-- no SECURITY DEFINER function is exposed through the Data API.

revoke insert, update, delete, truncate, references, trigger on table
  public.admin_user_branches,
  public.audit_logs,
  public.contact_messages,
  public.customer_documents,
  public.customer_loyalty_ledger,
  public.customer_payment_methods,
  public.customer_referral_codes,
  public.customer_referral_rewards,
  public.customer_referrals,
  public.customer_vault_consents,
  public.customer_vault_terms,
  public.geo_districts,
  public.geo_provinces,
  public.media_assets,
  public.newsletter_consent_events,
  public.notification_deliveries,
  public.partner_requests,
  public.payment_transactions,
  public.staff_branch_assignments,
  public.staff_profiles,
  public.tour_staff_assignments,
  public.vehicle_inspections,
  public.vehicle_staff_assignments
from anon;

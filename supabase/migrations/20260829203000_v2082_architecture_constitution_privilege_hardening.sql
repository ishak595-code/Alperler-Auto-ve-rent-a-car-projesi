-- V208.2 Architecture Constitution
-- 1) Admin audit reads are served through a server-authorized RPC/BFF contract.
-- 2) Anonymous clients keep only explicitly intended table privileges; stale DML
--    and table-maintenance privileges are removed even where RLS already denies them.

create or replace function public.service_admin_audit_snapshot_v2082(
  p_actor uuid,
  p_limit integer default 300
)
returns table (
  id bigint,
  actor_user_id uuid,
  actor_email text,
  action text,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 300), 1), 500);
begin
  if p_actor is null or not exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        au.role in ('owner', 'admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"finance.read":true}'::jsonb
      )
  ) then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.actor_user_id,
    l.actor_email,
    l.action,
    l.entity_type,
    l.entity_id,
    l.before_data,
    l.after_data,
    l.created_at
  from public.audit_logs l
  order by l.created_at desc, l.id desc
  limit v_limit;
end;
$$;

revoke all on function public.service_admin_audit_snapshot_v2082(uuid, integer) from public;
revoke all on function public.service_admin_audit_snapshot_v2082(uuid, integer) from anon;
revoke all on function public.service_admin_audit_snapshot_v2082(uuid, integer) from authenticated;
grant execute on function public.service_admin_audit_snapshot_v2082(uuid, integer) to service_role;

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

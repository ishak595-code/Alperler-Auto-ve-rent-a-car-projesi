begin;

-- V184.1: the central Super Admin catalog now writes exclusively through
-- /api/partner?op=catalog-admin -> catalog-admin-gateway-v184 -> service-role RPCs.
-- Remove only the legacy browser-admin write policies. Branch partner policies,
-- authenticated/public read policies and table grants remain untouched.

drop policy if exists vehicles_admin_insert on public.vehicles;
drop policy if exists vehicles_admin_update on public.vehicles;
drop policy if exists vehicles_admin_delete on public.vehicles;

drop policy if exists tours_admin_insert on public.tours;
drop policy if exists tours_admin_update on public.tours;
drop policy if exists tours_admin_delete on public.tours;

commit;

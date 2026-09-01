-- V225 phase 2. Apply after the branch admin writer and branch profile RPC client are deployed.
-- Browser-authenticated roles keep read access only. Branch profile writes use service_update_branch_profile_v225;
-- admin branch writes use the server-side /api/branches service-role boundary.

revoke insert, update, delete on table public.branches from authenticated;

drop policy if exists branches_admin_delete on public.branches;
drop policy if exists branches_admin_insert on public.branches;
drop policy if exists branches_authenticated_update_v188 on public.branches;

-- Keep authenticated SELECT governed by branches_authenticated_read_v188 and anon SELECT by branches_public_read.

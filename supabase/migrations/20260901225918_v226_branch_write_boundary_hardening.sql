-- v2.26 production parity: branch access invites are control-plane records.
-- Client roles may read only what RLS permits, while invite mutations must flow
-- through the audited SECURITY DEFINER RPC boundary.
-- This migration version already exists in production; the source file restores
-- repository/production migration parity without widening unrelated branch grants.

begin;

revoke insert, update, delete
  on table public.branch_access_invites
  from anon, authenticated;

commit;

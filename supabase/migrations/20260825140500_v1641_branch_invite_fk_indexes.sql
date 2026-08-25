-- V164.1: cover branch_access_invites foreign keys reported by the Supabase performance advisor.
-- These indexes keep invite cleanup, user deletion/linkage, and partner-request joins efficient
-- as the branch network grows.

create index if not exists branch_access_invites_partner_request_id_idx
  on public.branch_access_invites(partner_request_id);

create index if not exists branch_access_invites_auth_user_id_idx
  on public.branch_access_invites(auth_user_id);

create index if not exists branch_access_invites_invited_by_idx
  on public.branch_access_invites(invited_by);

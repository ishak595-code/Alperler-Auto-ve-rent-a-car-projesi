-- V130d: add covering indexes for foreign keys reported by Supabase Performance Advisor.
CREATE INDEX IF NOT EXISTS branch_partner_requests_approved_by_idx ON public.branch_partner_requests (approved_by);
CREATE INDEX IF NOT EXISTS branch_partner_requests_provisioned_by_idx ON public.branch_partner_requests (provisioned_by);
CREATE INDEX IF NOT EXISTS branch_policy_acceptances_accepted_by_idx ON public.branch_policy_acceptances (accepted_by);
CREATE INDEX IF NOT EXISTS branch_policy_acceptances_policy_rule_id_idx ON public.branch_policy_acceptances (policy_rule_id);
CREATE INDEX IF NOT EXISTS branch_setup_checklist_completed_by_idx ON public.branch_setup_checklist (completed_by);
CREATE INDEX IF NOT EXISTS newsletter_consent_events_subscriber_id_idx ON public.newsletter_consent_events (subscriber_id);
CREATE INDEX IF NOT EXISTS tours_approved_by_idx ON public.tours (approved_by);
CREATE INDEX IF NOT EXISTS tours_submitted_by_idx ON public.tours (submitted_by);
CREATE INDEX IF NOT EXISTS vehicles_approved_by_idx ON public.vehicles (approved_by);
CREATE INDEX IF NOT EXISTS vehicles_submitted_by_idx ON public.vehicles (submitted_by);

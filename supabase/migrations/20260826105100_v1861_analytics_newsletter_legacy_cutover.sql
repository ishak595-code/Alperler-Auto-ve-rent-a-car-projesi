begin;

-- V186.1: Analytics admin now enters through same-origin BFF -> analytics-admin-v186
-- -> service_analytics_query_v186. The legacy authenticated RPC surface is no longer needed.
revoke execute on function public.analytics_overview(integer) from anon, authenticated;
revoke execute on function public.analytics_live_sessions(integer) from anon, authenticated;
revoke execute on function public.analytics_top_pages(integer,integer) from anon, authenticated;
revoke execute on function public.analytics_interactions(integer,integer) from anon, authenticated;
revoke execute on function public.analytics_funnels(integer) from anon, authenticated;
revoke execute on function public.analytics_device_breakdown(integer) from anon, authenticated;
revoke execute on function public.analytics_session_timeline(uuid,integer) from anon, authenticated;
revoke execute on function public.purge_visitor_analytics(integer,integer) from anon, authenticated;

-- Newsletter public subscribe/unsubscribe and all admin operations run in trusted Edge functions.
-- Remove historical direct browser table policies and grants.
drop policy if exists newsletter_campaigns_admin_all on public.newsletter_campaigns;
drop policy if exists newsletter_deliveries_admin_all on public.newsletter_deliveries;
drop policy if exists subscribers_admin_read on public.subscribers;
drop policy if exists subscribers_admin_update on public.subscribers;

revoke select, insert, update, delete on table public.subscribers from anon, authenticated;
revoke select, insert, update, delete on table public.newsletter_campaigns from anon, authenticated;
revoke select, insert, update, delete on table public.newsletter_deliveries from anon, authenticated;

commit;

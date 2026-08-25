-- V173.1 Customer CRM legacy privilege revocation.
-- V173 production gateway is live. Privileged browser RPC execution is no longer required.

revoke all on function public.admin_set_customer_status(uuid,text) from public,anon,authenticated;
revoke all on function public.admin_link_booking_customer(text,uuid) from public,anon,authenticated;
revoke all on function public.admin_review_customer_document(uuid,text,text) from public,anon,authenticated;

grant execute on function public.admin_set_customer_status(uuid,text) to service_role;
grant execute on function public.admin_link_booking_customer(text,uuid) to service_role;
grant execute on function public.admin_review_customer_document(uuid,text,text) to service_role;

comment on function public.admin_set_customer_status(uuid,text) is 'Legacy V147 customer status RPC. V173.1 removes authenticated browser execution; service_role only.';
comment on function public.admin_link_booking_customer(text,uuid) is 'Legacy customer booking-link RPC. V173.1 removes authenticated browser execution; service_role only.';
comment on function public.admin_review_customer_document(uuid,text,text) is 'Legacy customer document review RPC. V173.1 removes authenticated browser execution; service_role only.';

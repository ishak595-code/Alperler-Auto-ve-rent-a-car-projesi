-- V226: customer footer is a public customer surface. Administrative access is
-- owned by authenticated account/admin flows and must never depend on CSS hiding.
update public.footer_links
set is_enabled = false
where config_key = 'main'
  and action_type = 'ADMIN';

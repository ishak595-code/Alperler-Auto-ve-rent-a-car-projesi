import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260826223000_v188_multibranch_rls_policy_consolidation.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const fail = (message) => {
  console.error(`V188_RLS_FAIL: ${message}`);
  process.exitCode = 1;
};

const targetTables = [
  'admin_users',
  'blog_posts',
  'booking_alternative_offers',
  'bookings',
  'branch_memberships',
  'branch_pricing_rules',
  'branch_setup_checklist',
  'branches',
  'catalog_media',
  'customer_loyalty_accounts',
  'customer_loyalty_ledger',
  'customer_payment_methods',
  'customer_profiles',
  'customer_vault_terms',
  'faqs',
  'loyalty_program_settings',
  'media_assets',
  'navigation_items',
  'network_policy_rules',
  'tours',
  'vehicle_inspections',
  'vehicle_operations',
  'vehicles',
];

for (const table of targetTables) {
  if (!sql.includes(`public.${table}`)) fail(`target table missing from migration: ${table}`);
}

const requiredPolicies = [
  'admin_users_authenticated_read_v188',
  'blog_authenticated_read_v188',
  'booking_alternative_authenticated_read_v188',
  'bookings_authenticated_read_v188',
  'branch_memberships_authenticated_read_v188',
  'branch_pricing_rules_authenticated_read_v188',
  'branch_setup_checklist_authenticated_read_v188',
  'branches_authenticated_read_v188',
  'branches_authenticated_update_v188',
  'catalog_media_authenticated_read_v188',
  'customer_loyalty_accounts_authenticated_read_v188',
  'customer_loyalty_ledger_authenticated_read_v188',
  'customer_payment_methods_authenticated_read_v188',
  'customer_profiles_authenticated_read_v188',
  'customer_vault_terms_authenticated_read_v188',
  'faqs_authenticated_read_v188',
  'media_authenticated_read_v188',
  'navigation_items_anon_read_v188',
  'navigation_items_authenticated_read_v188',
  'network_policy_rules_authenticated_read_v188',
  'tours_authenticated_read_v188',
  'vehicle_inspections_authenticated_read_v188',
  'vehicle_operations_authenticated_read_v188',
  'vehicles_authenticated_read_v188',
];
for (const policy of requiredPolicies) {
  if (!sql.includes(`create policy ${policy}`)) fail(`consolidated policy missing: ${policy}`);
}

const legacyDuplicatePolicies = [
  'admin_users_self_read', 'admin_users_team_read',
  'blog_admin_read', 'blog_authenticated_public_read',
  'booking_alternative_customer_read', 'booking_alternative_operations_read',
  'bookings_admin_read', 'bookings_branch_member_read', 'bookings_customer_self_read',
  'branch_memberships_admin_write', 'branch_memberships_self_read',
  'branch_pricing_rules_admin_write', 'branch_pricing_rules_branch_read',
  'branch_setup_checklist_admin_write', 'branch_setup_checklist_branch_read',
  'branches_admin_member_read', 'branches_authenticated_public_read',
  'branches_admin_update', 'branches_branch_member_update',
  'catalog_media_admin_read', 'catalog_media_authenticated_public_read', 'catalog_media_branch_member_read_v1716',
  'customer_loyalty_accounts_admin_read', 'customer_loyalty_accounts_self_read',
  'customer_loyalty_ledger_admin_read', 'customer_loyalty_ledger_self_read',
  'customer_payment_methods_admin_read', 'customer_payment_methods_self_read',
  'customer_profiles_admin_read', 'customer_profiles_self_read',
  'customer_vault_terms_admin_write', 'customer_vault_terms_read',
  'faqs_admin_read', 'faqs_authenticated_public_read',
  'loyalty_program_settings_admin_write',
  'media_admin_read', 'media_authenticated_public_read',
  'navigation_items_admin_read', 'navigation_items_public_read',
  'network_policy_rules_admin_write', 'network_policy_rules_admin_read', 'network_policy_rules_authenticated_public_read',
  'tours_admin_branch_read', 'tours_authenticated_public_read',
  'vehicle_inspections_admin_write', 'vehicle_inspections_admin_read',
  'vehicle_operations_admin_write', 'vehicle_operations_admin_read',
  'vehicles_admin_branch_read', 'vehicles_authenticated_public_read',
];
for (const policy of legacyDuplicatePolicies) {
  if (!sql.includes(`drop policy if exists ${policy}`)) fail(`legacy duplicate policy is not explicitly retired: ${policy}`);
}

if (/create\s+policy[\s\S]{0,240}\sfor\s+all\s/i.test(sql)) {
  fail('V188 must not create FOR ALL policies because they reintroduce SELECT overlap');
}

const requiredBoundaryTokens = [
  "user_id = (select auth.uid())",
  'private.can_manage_team()',
  'private.can_manage_content()',
  'private.can_manage_operations()',
  'can_manage_branch(id)',
  'can_operate_branch_lifecycle_v1718(id)',
  'can_operate_branch_subscription(id)',
  'can_manage_catalog_media_owner_v1716(branch_id, vehicle_id, tour_id, blog_post_id)',
  "public_status = 'ACTIVE'::text",
  "publication_status = 'PUBLISHED'::text",
  "publication_status = 'SCHEDULED'::text",
  'scheduled_at <= now()',
];
for (const token of requiredBoundaryTokens) {
  if (!sql.includes(token)) fail(`authorization/publication boundary token missing: ${token}`);
}

if (!sql.includes('navigation_items_anon_read_v188\non public.navigation_items for select to anon')) {
  fail('navigation public projection must remain anon-only after authenticated consolidation');
}
if (sql.includes('for select to anon, authenticated') || sql.includes('for select to authenticated, anon')) {
  fail('V188 must not create a mixed anon/authenticated SELECT policy');
}

const writeSplitTables = [
  'branch_memberships',
  'branch_pricing_rules',
  'branch_setup_checklist',
  'customer_vault_terms',
  'loyalty_program_settings',
  'network_policy_rules',
  'vehicle_inspections',
  'vehicle_operations',
];
for (const table of writeSplitTables) {
  for (const action of ['insert', 'update', 'delete']) {
    if (!sql.includes(`_${action}_v188`)) fail(`write split missing ${action} policy for ${table}`);
  }
}

if (!/^begin;[\s\S]*commit;\s*$/i.test(sql.trim())) fail('migration must remain transactional');

if (!process.exitCode) {
  console.log(`V188 RLS consolidation guard passed for ${targetTables.length} tables without FOR ALL overlap.`);
}

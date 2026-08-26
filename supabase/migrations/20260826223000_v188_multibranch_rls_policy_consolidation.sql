begin;

-- V188 consolidates equivalent permissive RLS predicates so each authenticated
-- SELECT/UPDATE path evaluates one policy per table instead of several OR-ed
-- policies. Anonymous public-read policies remain separate and unchanged.

-- admin_users SELECT: self OR team management.
drop policy if exists admin_users_self_read on public.admin_users;
drop policy if exists admin_users_team_read on public.admin_users;
drop policy if exists admin_users_authenticated_read_v188 on public.admin_users;
create policy admin_users_authenticated_read_v188
on public.admin_users for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_team()
);

-- blog_posts SELECT: public published rows OR content administrators.
drop policy if exists blog_admin_read on public.blog_posts;
drop policy if exists blog_authenticated_public_read on public.blog_posts;
drop policy if exists blog_authenticated_read_v188 on public.blog_posts;
create policy blog_authenticated_read_v188
on public.blog_posts for select to authenticated
using (
  status = 'PUBLISHED'::text
  or private.can_manage_content()
);

-- booking_alternative_offers SELECT: operations staff OR the owning customer
-- while the offer is customer-visible and the booking is not deleted.
drop policy if exists booking_alternative_customer_read on public.booking_alternative_offers;
drop policy if exists booking_alternative_operations_read on public.booking_alternative_offers;
drop policy if exists booking_alternative_authenticated_read_v188 on public.booking_alternative_offers;
create policy booking_alternative_authenticated_read_v188
on public.booking_alternative_offers for select to authenticated
using (
  (select private.can_manage_operations())
  or (
    status = any(array['OFFERED'::text, 'ACCEPTED'::text])
    and exists (
      select 1
      from public.bookings b
      where b.id = booking_alternative_offers.booking_id
        and b.customer_user_id = (select auth.uid())
        and b.deleted_at is null
    )
  )
);

-- bookings SELECT: operations, assigned branch operator, or owning customer.
drop policy if exists bookings_admin_read on public.bookings;
drop policy if exists bookings_branch_member_read on public.bookings;
drop policy if exists bookings_customer_self_read on public.bookings;
drop policy if exists bookings_authenticated_read_v188 on public.bookings;
create policy bookings_authenticated_read_v188
on public.bookings for select to authenticated
using (
  private.can_manage_operations()
  or (
    fulfillment_branch_id is not null
    and can_manage_branch(fulfillment_branch_id)
  )
  or (
    customer_user_id = (select auth.uid())
    and deleted_at is null
  )
);

-- branch_memberships: remove SELECT overlap caused by ALL policy while
-- preserving identical team-management write authorization.
drop policy if exists branch_memberships_admin_write on public.branch_memberships;
drop policy if exists branch_memberships_self_read on public.branch_memberships;
drop policy if exists branch_memberships_authenticated_read_v188 on public.branch_memberships;
drop policy if exists branch_memberships_admin_insert_v188 on public.branch_memberships;
drop policy if exists branch_memberships_admin_update_v188 on public.branch_memberships;
drop policy if exists branch_memberships_admin_delete_v188 on public.branch_memberships;
create policy branch_memberships_authenticated_read_v188
on public.branch_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_team()
);
create policy branch_memberships_admin_insert_v188
on public.branch_memberships for insert to authenticated
with check (private.can_manage_team());
create policy branch_memberships_admin_update_v188
on public.branch_memberships for update to authenticated
using (private.can_manage_team())
with check (private.can_manage_team());
create policy branch_memberships_admin_delete_v188
on public.branch_memberships for delete to authenticated
using (private.can_manage_team());

-- branch_pricing_rules: branch/global read plus team write, without ALL/SELECT overlap.
drop policy if exists branch_pricing_rules_admin_write on public.branch_pricing_rules;
drop policy if exists branch_pricing_rules_branch_read on public.branch_pricing_rules;
drop policy if exists branch_pricing_rules_authenticated_read_v188 on public.branch_pricing_rules;
drop policy if exists branch_pricing_rules_admin_insert_v188 on public.branch_pricing_rules;
drop policy if exists branch_pricing_rules_admin_update_v188 on public.branch_pricing_rules;
drop policy if exists branch_pricing_rules_admin_delete_v188 on public.branch_pricing_rules;
create policy branch_pricing_rules_authenticated_read_v188
on public.branch_pricing_rules for select to authenticated
using (
  branch_id is null
  or can_manage_branch(branch_id)
  or private.can_manage_team()
);
create policy branch_pricing_rules_admin_insert_v188
on public.branch_pricing_rules for insert to authenticated
with check (private.can_manage_team());
create policy branch_pricing_rules_admin_update_v188
on public.branch_pricing_rules for update to authenticated
using (private.can_manage_team())
with check (private.can_manage_team());
create policy branch_pricing_rules_admin_delete_v188
on public.branch_pricing_rules for delete to authenticated
using (private.can_manage_team());

-- branch_setup_checklist: branch operator/team read plus team write.
drop policy if exists branch_setup_checklist_admin_write on public.branch_setup_checklist;
drop policy if exists branch_setup_checklist_branch_read on public.branch_setup_checklist;
drop policy if exists branch_setup_checklist_authenticated_read_v188 on public.branch_setup_checklist;
drop policy if exists branch_setup_checklist_admin_insert_v188 on public.branch_setup_checklist;
drop policy if exists branch_setup_checklist_admin_update_v188 on public.branch_setup_checklist;
drop policy if exists branch_setup_checklist_admin_delete_v188 on public.branch_setup_checklist;
create policy branch_setup_checklist_authenticated_read_v188
on public.branch_setup_checklist for select to authenticated
using (
  can_manage_branch(branch_id)
  or private.can_manage_team()
);
create policy branch_setup_checklist_admin_insert_v188
on public.branch_setup_checklist for insert to authenticated
with check (private.can_manage_team());
create policy branch_setup_checklist_admin_update_v188
on public.branch_setup_checklist for update to authenticated
using (private.can_manage_team())
with check (private.can_manage_team());
create policy branch_setup_checklist_admin_delete_v188
on public.branch_setup_checklist for delete to authenticated
using (private.can_manage_team());

-- branches SELECT and UPDATE: preserve public, team, and branch-member OR semantics.
drop policy if exists branches_admin_member_read on public.branches;
drop policy if exists branches_authenticated_public_read on public.branches;
drop policy if exists branches_authenticated_read_v188 on public.branches;
create policy branches_authenticated_read_v188
on public.branches for select to authenticated
using (
  private.can_manage_team()
  or can_manage_branch(id)
  or (is_active = true and public_status = 'ACTIVE'::text)
);

drop policy if exists branches_admin_update on public.branches;
drop policy if exists branches_branch_member_update on public.branches;
drop policy if exists branches_authenticated_update_v188 on public.branches;
create policy branches_authenticated_update_v188
on public.branches for update to authenticated
using (
  private.can_manage_team()
  or (
    can_manage_branch(id)
    and can_operate_branch_lifecycle_v1718(id)
  )
)
with check (
  private.can_manage_team()
  or (
    can_manage_branch(id)
    and can_operate_branch_lifecycle_v1718(id)
    and can_operate_branch_subscription(id)
  )
);

-- catalog_media SELECT: public active media, content admins, or scoped branch owner.
drop policy if exists catalog_media_admin_read on public.catalog_media;
drop policy if exists catalog_media_authenticated_public_read on public.catalog_media;
drop policy if exists catalog_media_branch_member_read_v1716 on public.catalog_media;
drop policy if exists catalog_media_authenticated_read_v188 on public.catalog_media;
create policy catalog_media_authenticated_read_v188
on public.catalog_media for select to authenticated
using (
  is_active = true
  or private.can_manage_content()
  or can_manage_catalog_media_owner_v1716(branch_id, vehicle_id, tour_id, blog_post_id)
);

-- Customer-owned read models: operations staff OR owning customer.
drop policy if exists customer_loyalty_accounts_admin_read on public.customer_loyalty_accounts;
drop policy if exists customer_loyalty_accounts_self_read on public.customer_loyalty_accounts;
drop policy if exists customer_loyalty_accounts_authenticated_read_v188 on public.customer_loyalty_accounts;
create policy customer_loyalty_accounts_authenticated_read_v188
on public.customer_loyalty_accounts for select to authenticated
using (
  (select private.can_manage_operations())
  or user_id = (select auth.uid())
);

drop policy if exists customer_loyalty_ledger_admin_read on public.customer_loyalty_ledger;
drop policy if exists customer_loyalty_ledger_self_read on public.customer_loyalty_ledger;
drop policy if exists customer_loyalty_ledger_authenticated_read_v188 on public.customer_loyalty_ledger;
create policy customer_loyalty_ledger_authenticated_read_v188
on public.customer_loyalty_ledger for select to authenticated
using (
  (select private.can_manage_operations())
  or user_id = (select auth.uid())
);

drop policy if exists customer_payment_methods_admin_read on public.customer_payment_methods;
drop policy if exists customer_payment_methods_self_read on public.customer_payment_methods;
drop policy if exists customer_payment_methods_authenticated_read_v188 on public.customer_payment_methods;
create policy customer_payment_methods_authenticated_read_v188
on public.customer_payment_methods for select to authenticated
using (
  (select private.can_manage_operations())
  or user_id = (select auth.uid())
);

drop policy if exists customer_profiles_admin_read on public.customer_profiles;
drop policy if exists customer_profiles_self_read on public.customer_profiles;
drop policy if exists customer_profiles_authenticated_read_v188 on public.customer_profiles;
create policy customer_profiles_authenticated_read_v188
on public.customer_profiles for select to authenticated
using (
  (select private.can_manage_operations())
  or user_id = (select auth.uid())
);

-- customer_vault_terms: public active/operations/settings read, settings-only writes.
drop policy if exists customer_vault_terms_admin_write on public.customer_vault_terms;
drop policy if exists customer_vault_terms_read on public.customer_vault_terms;
drop policy if exists customer_vault_terms_authenticated_read_v188 on public.customer_vault_terms;
drop policy if exists customer_vault_terms_admin_insert_v188 on public.customer_vault_terms;
drop policy if exists customer_vault_terms_admin_update_v188 on public.customer_vault_terms;
drop policy if exists customer_vault_terms_admin_delete_v188 on public.customer_vault_terms;
create policy customer_vault_terms_authenticated_read_v188
on public.customer_vault_terms for select to authenticated
using (
  is_active
  or (select private.can_manage_operations())
  or (select private.can_manage_settings())
);
create policy customer_vault_terms_admin_insert_v188
on public.customer_vault_terms for insert to authenticated
with check ((select private.can_manage_settings()));
create policy customer_vault_terms_admin_update_v188
on public.customer_vault_terms for update to authenticated
using ((select private.can_manage_settings()))
with check ((select private.can_manage_settings()));
create policy customer_vault_terms_admin_delete_v188
on public.customer_vault_terms for delete to authenticated
using ((select private.can_manage_settings()));

-- faqs SELECT: public active rows OR content administrators.
drop policy if exists faqs_admin_read on public.faqs;
drop policy if exists faqs_authenticated_public_read on public.faqs;
drop policy if exists faqs_authenticated_read_v188 on public.faqs;
create policy faqs_authenticated_read_v188
on public.faqs for select to authenticated
using (
  is_active = true
  or private.can_manage_content()
);

-- loyalty_program_settings: SELECT remains public. Split admin ALL policy into writes.
drop policy if exists loyalty_program_settings_admin_write on public.loyalty_program_settings;
drop policy if exists loyalty_program_settings_admin_insert_v188 on public.loyalty_program_settings;
drop policy if exists loyalty_program_settings_admin_update_v188 on public.loyalty_program_settings;
drop policy if exists loyalty_program_settings_admin_delete_v188 on public.loyalty_program_settings;
create policy loyalty_program_settings_admin_insert_v188
on public.loyalty_program_settings for insert to authenticated
with check ((select private.can_manage_settings()));
create policy loyalty_program_settings_admin_update_v188
on public.loyalty_program_settings for update to authenticated
using ((select private.can_manage_settings()))
with check ((select private.can_manage_settings()));
create policy loyalty_program_settings_admin_delete_v188
on public.loyalty_program_settings for delete to authenticated
using ((select private.can_manage_settings()));

-- media_assets SELECT: public media OR content administrators.
drop policy if exists media_admin_read on public.media_assets;
drop policy if exists media_authenticated_public_read on public.media_assets;
drop policy if exists media_authenticated_read_v188 on public.media_assets;
create policy media_authenticated_read_v188
on public.media_assets for select to authenticated
using (
  is_public = true
  or private.can_manage_content()
);

-- navigation_items: keep anon public projection and consolidate authenticated read.
drop policy if exists navigation_items_admin_read on public.navigation_items;
drop policy if exists navigation_items_public_read on public.navigation_items;
drop policy if exists navigation_items_anon_read_v188 on public.navigation_items;
drop policy if exists navigation_items_authenticated_read_v188 on public.navigation_items;
create policy navigation_items_anon_read_v188
on public.navigation_items for select to anon
using (is_active = true and archived_at is null);
create policy navigation_items_authenticated_read_v188
on public.navigation_items for select to authenticated
using (
  private.can_manage_content()
  or (is_active = true and archived_at is null)
);

-- network_policy_rules: public active OR admin/team read. Team-only writes.
drop policy if exists network_policy_rules_admin_write on public.network_policy_rules;
drop policy if exists network_policy_rules_admin_read on public.network_policy_rules;
drop policy if exists network_policy_rules_authenticated_public_read on public.network_policy_rules;
drop policy if exists network_policy_rules_authenticated_read_v188 on public.network_policy_rules;
drop policy if exists network_policy_rules_admin_insert_v188 on public.network_policy_rules;
drop policy if exists network_policy_rules_admin_update_v188 on public.network_policy_rules;
drop policy if exists network_policy_rules_admin_delete_v188 on public.network_policy_rules;
create policy network_policy_rules_authenticated_read_v188
on public.network_policy_rules for select to authenticated
using (
  is_active = true
  or private.is_admin()
  or private.can_manage_team()
);
create policy network_policy_rules_admin_insert_v188
on public.network_policy_rules for insert to authenticated
with check (private.can_manage_team());
create policy network_policy_rules_admin_update_v188
on public.network_policy_rules for update to authenticated
using (private.can_manage_team())
with check (private.can_manage_team());
create policy network_policy_rules_admin_delete_v188
on public.network_policy_rules for delete to authenticated
using (private.can_manage_team());

-- tours SELECT: public publication projection OR content/owning branch management.
drop policy if exists tours_admin_branch_read on public.tours;
drop policy if exists tours_authenticated_public_read on public.tours;
drop policy if exists tours_authenticated_read_v188 on public.tours;
create policy tours_authenticated_read_v188
on public.tours for select to authenticated
using (
  private.can_manage_content()
  or (branch_id is not null and can_manage_branch(branch_id))
  or (
    is_active = true
    and (
      publication_status = 'PUBLISHED'::text
      or (
        publication_status = 'SCHEDULED'::text
        and scheduled_at is not null
        and scheduled_at <= now()
      )
    )
    and (
      branch_id is null
      or exists (
        select 1 from public.branches b
        where b.id = tours.branch_id
          and b.is_active = true
          and b.public_status = 'ACTIVE'::text
      )
    )
  )
);

-- vehicle_inspections: identical read/write predicate, split ALL to avoid SELECT overlap.
drop policy if exists vehicle_inspections_admin_write on public.vehicle_inspections;
drop policy if exists vehicle_inspections_admin_read on public.vehicle_inspections;
drop policy if exists vehicle_inspections_authenticated_read_v188 on public.vehicle_inspections;
drop policy if exists vehicle_inspections_admin_insert_v188 on public.vehicle_inspections;
drop policy if exists vehicle_inspections_admin_update_v188 on public.vehicle_inspections;
drop policy if exists vehicle_inspections_admin_delete_v188 on public.vehicle_inspections;
create policy vehicle_inspections_authenticated_read_v188
on public.vehicle_inspections for select to authenticated
using (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_inspections_admin_insert_v188
on public.vehicle_inspections for insert to authenticated
with check (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_inspections_admin_update_v188
on public.vehicle_inspections for update to authenticated
using (private.can_manage_operations() or private.can_manage_settings())
with check (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_inspections_admin_delete_v188
on public.vehicle_inspections for delete to authenticated
using (private.can_manage_operations() or private.can_manage_settings());

-- vehicle_operations: identical read/write predicate, split ALL to avoid SELECT overlap.
drop policy if exists vehicle_operations_admin_write on public.vehicle_operations;
drop policy if exists vehicle_operations_admin_read on public.vehicle_operations;
drop policy if exists vehicle_operations_authenticated_read_v188 on public.vehicle_operations;
drop policy if exists vehicle_operations_admin_insert_v188 on public.vehicle_operations;
drop policy if exists vehicle_operations_admin_update_v188 on public.vehicle_operations;
drop policy if exists vehicle_operations_admin_delete_v188 on public.vehicle_operations;
create policy vehicle_operations_authenticated_read_v188
on public.vehicle_operations for select to authenticated
using (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_operations_admin_insert_v188
on public.vehicle_operations for insert to authenticated
with check (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_operations_admin_update_v188
on public.vehicle_operations for update to authenticated
using (private.can_manage_operations() or private.can_manage_settings())
with check (private.can_manage_operations() or private.can_manage_settings());
create policy vehicle_operations_admin_delete_v188
on public.vehicle_operations for delete to authenticated
using (private.can_manage_operations() or private.can_manage_settings());

-- vehicles SELECT: public publication projection OR content/owning branch management.
drop policy if exists vehicles_admin_branch_read on public.vehicles;
drop policy if exists vehicles_authenticated_public_read on public.vehicles;
drop policy if exists vehicles_authenticated_read_v188 on public.vehicles;
create policy vehicles_authenticated_read_v188
on public.vehicles for select to authenticated
using (
  private.can_manage_content()
  or (branch_id is not null and can_manage_branch(branch_id))
  or (
    is_active = true
    and (
      publication_status = 'PUBLISHED'::text
      or (
        publication_status = 'SCHEDULED'::text
        and scheduled_at is not null
        and scheduled_at <= now()
      )
    )
    and (
      branch_id is null
      or exists (
        select 1 from public.branches b
        where b.id = vehicles.branch_id
          and b.is_active = true
          and b.public_status = 'ACTIVE'::text
      )
    )
  )
);

commit;

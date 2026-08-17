-- V82: Public storefront RLS must never invoke authenticated-only admin helpers.
-- Public visibility and privileged visibility are deliberately separated by role.

-- BRANCHES
DROP POLICY IF EXISTS branches_public_read ON public.branches;
DROP POLICY IF EXISTS branches_authenticated_public_read ON public.branches;
DROP POLICY IF EXISTS branches_admin_member_read ON public.branches;
CREATE POLICY branches_public_read
ON public.branches FOR SELECT TO anon
USING (is_active = true AND public_status = 'ACTIVE');
CREATE POLICY branches_authenticated_public_read
ON public.branches FOR SELECT TO authenticated
USING (is_active = true AND public_status = 'ACTIVE');
CREATE POLICY branches_admin_member_read
ON public.branches FOR SELECT TO authenticated
USING (private.can_manage_team() OR public.can_manage_branch(id));

-- VEHICLES
DROP POLICY IF EXISTS vehicles_public_read ON public.vehicles;
DROP POLICY IF EXISTS vehicles_authenticated_public_read ON public.vehicles;
DROP POLICY IF EXISTS vehicles_admin_branch_read ON public.vehicles;
CREATE POLICY vehicles_public_read
ON public.vehicles FOR SELECT TO anon
USING (
  is_active = true
  AND (
    publication_status = 'PUBLISHED'
    OR (publication_status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
  )
  AND (
    branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = vehicles.branch_id
        AND b.is_active = true
        AND b.public_status = 'ACTIVE'
    )
  )
);
CREATE POLICY vehicles_authenticated_public_read
ON public.vehicles FOR SELECT TO authenticated
USING (
  is_active = true
  AND (
    publication_status = 'PUBLISHED'
    OR (publication_status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
  )
  AND (
    branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = vehicles.branch_id
        AND b.is_active = true
        AND b.public_status = 'ACTIVE'
    )
  )
);
CREATE POLICY vehicles_admin_branch_read
ON public.vehicles FOR SELECT TO authenticated
USING (
  private.can_manage_content()
  OR (branch_id IS NOT NULL AND public.can_manage_branch(branch_id))
);

-- TOURS
DROP POLICY IF EXISTS tours_public_read ON public.tours;
DROP POLICY IF EXISTS tours_authenticated_public_read ON public.tours;
DROP POLICY IF EXISTS tours_admin_branch_read ON public.tours;
CREATE POLICY tours_public_read
ON public.tours FOR SELECT TO anon
USING (
  is_active = true
  AND (
    publication_status = 'PUBLISHED'
    OR (publication_status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
  )
  AND (
    branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = tours.branch_id
        AND b.is_active = true
        AND b.public_status = 'ACTIVE'
    )
  )
);
CREATE POLICY tours_authenticated_public_read
ON public.tours FOR SELECT TO authenticated
USING (
  is_active = true
  AND (
    publication_status = 'PUBLISHED'
    OR (publication_status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
  )
  AND (
    branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = tours.branch_id
        AND b.is_active = true
        AND b.public_status = 'ACTIVE'
    )
  )
);
CREATE POLICY tours_admin_branch_read
ON public.tours FOR SELECT TO authenticated
USING (
  private.can_manage_content()
  OR (branch_id IS NOT NULL AND public.can_manage_branch(branch_id))
);

-- BLOG
DROP POLICY IF EXISTS blog_public_read ON public.blog_posts;
DROP POLICY IF EXISTS blog_authenticated_public_read ON public.blog_posts;
DROP POLICY IF EXISTS blog_admin_read ON public.blog_posts;
CREATE POLICY blog_public_read
ON public.blog_posts FOR SELECT TO anon
USING (status = 'PUBLISHED');
CREATE POLICY blog_authenticated_public_read
ON public.blog_posts FOR SELECT TO authenticated
USING (status = 'PUBLISHED');
CREATE POLICY blog_admin_read
ON public.blog_posts FOR SELECT TO authenticated
USING (private.can_manage_content());

-- FAQS
DROP POLICY IF EXISTS faqs_public_read ON public.faqs;
DROP POLICY IF EXISTS faqs_authenticated_public_read ON public.faqs;
DROP POLICY IF EXISTS faqs_admin_read ON public.faqs;
CREATE POLICY faqs_public_read
ON public.faqs FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY faqs_authenticated_public_read
ON public.faqs FOR SELECT TO authenticated
USING (is_active = true);
CREATE POLICY faqs_admin_read
ON public.faqs FOR SELECT TO authenticated
USING (private.can_manage_content());

-- CATALOG MEDIA
DROP POLICY IF EXISTS catalog_media_public_read ON public.catalog_media;
DROP POLICY IF EXISTS catalog_media_authenticated_public_read ON public.catalog_media;
DROP POLICY IF EXISTS catalog_media_admin_read ON public.catalog_media;
CREATE POLICY catalog_media_public_read
ON public.catalog_media FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY catalog_media_authenticated_public_read
ON public.catalog_media FOR SELECT TO authenticated
USING (is_active = true);
CREATE POLICY catalog_media_admin_read
ON public.catalog_media FOR SELECT TO authenticated
USING (private.can_manage_content());

-- MEDIA ASSETS
DROP POLICY IF EXISTS media_public_read ON public.media_assets;
DROP POLICY IF EXISTS media_authenticated_public_read ON public.media_assets;
DROP POLICY IF EXISTS media_admin_read ON public.media_assets;
CREATE POLICY media_public_read
ON public.media_assets FOR SELECT TO anon
USING (is_public = true);
CREATE POLICY media_authenticated_public_read
ON public.media_assets FOR SELECT TO authenticated
USING (is_public = true);
CREATE POLICY media_admin_read
ON public.media_assets FOR SELECT TO authenticated
USING (private.can_manage_content());

-- NETWORK POLICY RULES
DROP POLICY IF EXISTS network_policy_rules_read ON public.network_policy_rules;
DROP POLICY IF EXISTS network_policy_rules_authenticated_public_read ON public.network_policy_rules;
DROP POLICY IF EXISTS network_policy_rules_admin_read ON public.network_policy_rules;
CREATE POLICY network_policy_rules_read
ON public.network_policy_rules FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY network_policy_rules_authenticated_public_read
ON public.network_policy_rules FOR SELECT TO authenticated
USING (is_active = true);
CREATE POLICY network_policy_rules_admin_read
ON public.network_policy_rules FOR SELECT TO authenticated
USING (private.is_admin());

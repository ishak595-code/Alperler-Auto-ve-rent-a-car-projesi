do $$
declare
  anon_write boolean;
  auth_update boolean;
  rls_enabled boolean;
  policy_count integer;
  mobile_search_count integer;
  non_manual_content_count integer;
begin
  select relrowsecurity into rls_enabled
  from pg_class
  where oid = 'public.customer_favorites'::regclass;
  if rls_enabled is distinct from true then
    raise exception 'V213: customer_favorites RLS must be enabled';
  end if;

  select
    has_table_privilege('anon', 'public.customer_favorites', 'SELECT')
    or has_table_privilege('anon', 'public.customer_favorites', 'INSERT')
    or has_table_privilege('anon', 'public.customer_favorites', 'UPDATE')
    or has_table_privilege('anon', 'public.customer_favorites', 'DELETE')
  into anon_write;
  if anon_write then
    raise exception 'V213: anon must have zero customer_favorites table privileges';
  end if;

  if not has_table_privilege('authenticated', 'public.customer_favorites', 'SELECT')
     or not has_table_privilege('authenticated', 'public.customer_favorites', 'INSERT')
     or not has_table_privilege('authenticated', 'public.customer_favorites', 'DELETE') then
    raise exception 'V213: authenticated requires SELECT/INSERT/DELETE on customer_favorites';
  end if;

  select has_table_privilege('authenticated', 'public.customer_favorites', 'UPDATE') into auth_update;
  if auth_update then
    raise exception 'V213: customer_favorites must not expose UPDATE to authenticated';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'customer_favorites'
    and policyname in ('customer_favorites_select_own', 'customer_favorites_insert_own', 'customer_favorites_delete_own');
  if policy_count <> 3 then
    raise exception 'V213: expected three owner-only customer_favorites policies, found %', policy_count;
  end if;

  select count(*) into mobile_search_count
  from public.navigation_items
  where surface = 'MOBILE_MENU'
    and item_key = 'search'
    and route = '/search'
    and is_active = true
    and archived_at is null;
  if mobile_search_count <> 1 then
    raise exception 'V213: mobile menu must have exactly one active global search entry';
  end if;

  select count(*) into non_manual_content_count
  from public.homepage_sections
  where is_enabled = true
    and section_type in ('VEHICLES', 'TOURS', 'BLOG', 'CAMPAIGN')
    and coalesce(settings->>'selectionMode', '') <> 'PLACEMENT';
  if non_manual_content_count <> 0 then
    raise exception 'V213: active content showcases must be placement-driven';
  end if;
end $$;

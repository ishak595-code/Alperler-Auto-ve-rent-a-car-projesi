-- V238: Search belongs to the fixed mobile dock only.
update public.navigation_items
set is_active = false,
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
where surface = 'MOBILE_MENU'
  and item_key = 'search'
  and archived_at is null;

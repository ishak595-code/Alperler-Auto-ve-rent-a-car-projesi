-- V130c: public navigation must never point to private or operational surfaces.
ALTER TABLE public.navigation_items
  ADD CONSTRAINT navigation_items_public_route_guard
  CHECK (route IS NULL OR route !~ '^/(admin|branch-portal|track-car|booking-checkout)(/|$)')
  NOT VALID;

ALTER TABLE public.navigation_items
  VALIDATE CONSTRAINT navigation_items_public_route_guard;

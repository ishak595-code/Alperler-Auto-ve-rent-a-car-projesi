-- Consolidate publication validation on the V52 public quality gates.
-- Legacy private trigger functions are intentionally left in place for migration
-- history, but they no longer execute. Audit/update/projection triggers remain.

drop trigger if exists trg_vehicle_publication_quality on public.vehicles;
drop trigger if exists trg_tour_publication_quality on public.tours;

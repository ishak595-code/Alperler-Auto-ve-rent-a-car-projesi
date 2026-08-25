-- V166.2 Commercial offer quote FK index hardening.
-- Cover high-cardinality foreign keys reported by the production performance advisor.

create index if not exists commercial_offer_quotes_vehicle_id_idx
  on public.commercial_offer_quotes(vehicle_id)
  where vehicle_id is not null;

create index if not exists commercial_offer_quotes_tour_id_idx
  on public.commercial_offer_quotes(tour_id)
  where tour_id is not null;

create index if not exists commercial_offer_quotes_campaign_id_idx
  on public.commercial_offer_quotes(campaign_id)
  where campaign_id is not null;

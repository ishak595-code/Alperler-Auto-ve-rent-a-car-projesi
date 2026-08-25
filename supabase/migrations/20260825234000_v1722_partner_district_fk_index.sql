-- V172.2 advisor hardening
-- Covers partner_requests.district_code as the leading index key for FK maintenance and district-scoped valuation queries.

create index if not exists partner_requests_district_code_v1722_idx
  on public.partner_requests(district_code);

begin;

-- Historical campaign placements predate the canonical campaign scheduling
-- contract and may therefore have null or stale visibility windows. Keep the
-- homepage placement window equal to its campaign source of truth without
-- hardcoding record identifiers. Future admin writes already persist these
-- fields through CampaignService.syncHomepageCampaigns().
update public.homepage_placements as hp
set
  starts_at = c.starts_at,
  ends_at = c.ends_at,
  updated_at = now()
from public.campaigns as c
where hp.section_key = 'campaigns'
  and hp.entity_type = 'CAMPAIGN'
  and hp.entity_id = c.id
  and (
    hp.starts_at is distinct from c.starts_at
    or hp.ends_at is distinct from c.ends_at
  );

commit;

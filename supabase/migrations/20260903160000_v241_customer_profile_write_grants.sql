begin;

-- RLS already limits UPDATE to auth.uid() = user_id. The authenticated role
-- also needs column-level UPDATE privileges for the fields the customer owns.
grant update (
  full_name,
  phone,
  birth_date,
  address_line,
  district,
  city,
  country,
  postal_code,
  preferred_locale,
  preferred_branch_id,
  marketing_consent,
  avatar_url,
  updated_at
) on table public.customer_profiles to authenticated;

commit;

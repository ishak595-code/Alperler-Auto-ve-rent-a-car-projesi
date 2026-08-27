alter table public.campaigns
  drop constraint if exists campaigns_display_price_matches_authoritative_v2002;

alter table public.campaigns
  add constraint campaigns_display_price_matches_authoritative_v2002
  check (
    old_price is null
    or new_price is null
    or case
      when discount_method = 'FIXED_PRICE' then abs(new_price - discount_value) <= 0.01
      when discount_method = 'FIXED_AMOUNT' and discount_scope = 'ORDER' then abs((old_price - new_price) - discount_value) <= 0.01
      when discount_method = 'PERCENT' then abs(new_price - (old_price * (1 - discount_value / 100.0))) <= 0.02
      else true
    end
  ) not valid;

alter table public.campaigns validate constraint campaigns_display_price_matches_authoritative_v2002;

create index if not exists customer_referrals_qualified_booking_idx on public.customer_referrals(qualified_booking_id) where qualified_booking_id is not null;
create index if not exists customer_loyalty_ledger_created_by_idx on public.customer_loyalty_ledger(created_by) where created_by is not null;
create index if not exists loyalty_program_settings_updated_by_idx on public.loyalty_program_settings(updated_by) where updated_by is not null;
create index if not exists customer_payment_tokens_user_idx on private.customer_payment_tokens(user_id);

drop policy if exists customer_referral_codes_self_read on public.customer_referral_codes;
drop policy if exists customer_referral_codes_admin_read on public.customer_referral_codes;
create policy customer_referral_codes_read on public.customer_referral_codes for select to authenticated using (
  (select auth.uid()) = user_id or (select private.can_manage_operations())
);

drop policy if exists customer_referrals_participant_read on public.customer_referrals;
drop policy if exists customer_referrals_admin_read on public.customer_referrals;
create policy customer_referrals_read on public.customer_referrals for select to authenticated using (
  (select auth.uid()) in (inviter_user_id, invitee_user_id) or (select private.can_manage_operations())
);

create or replace function public.customer_referral_summary() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'code', c.code,
    'registered', count(r.id),
    'rewarded', count(r.id) filter (where r.status='REWARDED'),
    'pending', count(r.id) filter (where r.status='REGISTERED'),
    'pointsEarned', coalesce(a.referral_points_earned,0),
    'successfulReferrals', coalesce(a.successful_referrals,0)
  )
  from public.customer_referral_codes c
  left join public.customer_referrals r on r.inviter_user_id=c.user_id
  left join public.customer_loyalty_accounts a on a.user_id=c.user_id
  where c.user_id=auth.uid() and c.is_active
  group by c.code,a.referral_points_earned,a.successful_referrals
$$;
revoke all on function public.customer_referral_summary() from public,anon;
grant execute on function public.customer_referral_summary() to authenticated;

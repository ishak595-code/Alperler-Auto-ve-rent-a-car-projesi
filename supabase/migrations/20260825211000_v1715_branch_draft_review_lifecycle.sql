-- V171.5 Branch draft -> review -> publish lifecycle
-- Branch members may keep DRAFT/REJECTED work private; submitting or editing a published listing re-enters review.

create or replace function public.enforce_branch_listing_review_v1712()
returns trigger
language plpgsql
set search_path=public,private,pg_catalog
as $$
declare
  v_requested text:=upper(btrim(coalesce(new.publication_status,'DRAFT')));
begin
  if new.branch_id is null or new.listing_origin<>'BRANCH' then return new; end if;
  if private.can_manage_content() then return new; end if;
  if not can_manage_branch(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_LISTING_PERMISSION_REQUIRED';
  end if;
  if not public.can_operate_branch_subscription(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_SUBSCRIPTION_REQUIRED';
  end if;

  -- Published/scheduled records edited by a branch always return to central review.
  if tg_op='UPDATE' and old.publication_status in ('PUBLISHED','SCHEDULED') then
    new.publication_status:='PENDING_REVIEW';
    new.published_at:=null;
    new.scheduled_at:=null;
    new.submitted_for_review_at:=now();
    new.reviewed_at:=null;
    new.reviewed_by:=null;
    new.review_note:=null;
    return new;
  end if;

  -- A branch can privately iterate on DRAFT or REJECTED records.
  if v_requested in ('DRAFT','REJECTED') then
    new.publication_status:=case when v_requested='REJECTED' then 'DRAFT' else 'DRAFT' end;
    new.published_at:=null;
    new.scheduled_at:=null;
    new.submitted_for_review_at:=null;
    return new;
  end if;

  -- Explicit submit or any attempt to self-publish is normalized into the review queue.
  new.publication_status:='PENDING_REVIEW';
  new.published_at:=null;
  new.scheduled_at:=null;
  new.submitted_for_review_at:=now();
  new.reviewed_at:=null;
  new.reviewed_by:=null;
  new.review_note:=null;
  return new;
end;
$$;

comment on function public.enforce_branch_listing_review_v1712() is
'V171.5: branch members may save private drafts; explicit submission or edits to published listings require fresh Super Admin review.';

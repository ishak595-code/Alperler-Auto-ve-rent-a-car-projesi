-- V75 - Allow an approved but not-yet-live branch to prepare listings for central prelaunch audit.

create or replace function public.enforce_branch_vehicle_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_price numeric;
  v_class text;
  v_is_central boolean;
  v_branch_status text;
  v_branch_enabled boolean;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_central := (auth.role() = 'service_role') or private.is_admin();
  select public_status,is_active into v_branch_status,v_branch_enabled from public.branches where id=new.branch_id;
  if v_branch_status is null then raise exception 'BRANCH_NOT_FOUND'; end if;
  if v_branch_status in ('SUSPENDED','CLOSED') and not v_is_central then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_central and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  v_price := case when new.category='RENTAL' then coalesce(new.rental_price_daily,new.price) else new.price end;
  v_class := coalesce(new.body_type,'*');
  if not public.branch_listing_price_ok(new.branch_id,new.category,v_class,new.currency,v_price) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_central then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_branch_tour_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_is_central boolean;
  v_branch_status text;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_central := (auth.role() = 'service_role') or private.is_admin();
  select public_status into v_branch_status from public.branches where id=new.branch_id;
  if v_branch_status is null then raise exception 'BRANCH_NOT_FOUND'; end if;
  if v_branch_status in ('SUSPENDED','CLOSED') and not v_is_central then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_central and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  if not public.branch_listing_price_ok(new.branch_id,'TOUR','*',new.currency,new.price_per_person) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_central then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

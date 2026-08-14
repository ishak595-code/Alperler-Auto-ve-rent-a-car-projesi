-- Protect the project from losing its final active owner.

create or replace function private.protect_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  other_owners integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.is_active then
      select count(*) into other_owners
      from public.admin_users
      where role = 'owner' and is_active = true and user_id <> old.user_id;
      if other_owners < 1 then
        raise exception 'LAST_ACTIVE_OWNER_PROTECTED';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'owner' and old.is_active
     and (new.role <> 'owner' or new.is_active = false) then
    select count(*) into other_owners
    from public.admin_users
    where role = 'owner' and is_active = true and user_id <> old.user_id;
    if other_owners < 1 then
      raise exception 'LAST_ACTIVE_OWNER_PROTECTED';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_last_active_owner() from public;

drop trigger if exists admin_users_protect_last_owner on public.admin_users;
create trigger admin_users_protect_last_owner
before update of role, is_active or delete on public.admin_users
for each row execute function private.protect_last_active_owner();

create index if not exists admin_users_active_role_idx
  on public.admin_users(role, is_active);

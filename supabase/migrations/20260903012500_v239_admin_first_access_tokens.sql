create table if not exists private.admin_first_access_tokens_v239 (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  processing_at timestamptz,
  used_at timestamptz,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  constraint admin_first_access_token_hash_v239_ck check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint admin_first_access_expiry_v239_ck check (expires_at > created_at),
  constraint admin_first_access_attempts_v239_ck check (failed_attempts between 0 and 20)
);

revoke all on table private.admin_first_access_tokens_v239 from public, anon, authenticated;

drop function if exists public.admin_first_access_claim_v239(text);
create function public.admin_first_access_claim_v239(p_token_hash text)
returns table(token_id uuid, user_id uuid, email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  return query
  update private.admin_first_access_tokens_v239 t
     set processing_at = now(),
         failed_attempts = t.failed_attempts + 1
   where t.token_hash = p_token_hash
     and t.used_at is null
     and t.expires_at > now()
     and t.failed_attempts < 8
     and (t.processing_at is null or t.processing_at < now() - interval '5 minutes')
     and exists (
       select 1
         from public.admin_users a
        where a.user_id = t.user_id
          and a.is_active = true
          and lower(a.role) = 'owner'
     )
  returning t.id, t.user_id, t.email;
end;
$$;

revoke all on function public.admin_first_access_claim_v239(text) from public, anon, authenticated;
grant execute on function public.admin_first_access_claim_v239(text) to service_role;

drop function if exists public.admin_first_access_finish_v239(text, boolean);
create function public.admin_first_access_finish_v239(p_token_hash text, p_success boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  if p_success then
    update private.admin_first_access_tokens_v239
       set used_at = now(), processing_at = null
     where token_hash = p_token_hash
       and used_at is null
       and processing_at is not null;
  else
    update private.admin_first_access_tokens_v239
       set processing_at = null
     where token_hash = p_token_hash
       and used_at is null;
  end if;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.admin_first_access_finish_v239(text, boolean) from public, anon, authenticated;
grant execute on function public.admin_first_access_finish_v239(text, boolean) to service_role;

comment on table private.admin_first_access_tokens_v239 is 'Short-lived, one-time password-setup grants for the active owner account. Raw tokens are never stored.';
comment on function public.admin_first_access_claim_v239(text) is 'Service-role-only atomic claim for one-time owner password setup.';
comment on function public.admin_first_access_finish_v239(text, boolean) is 'Service-role-only completion/release for an owner password-setup claim.';

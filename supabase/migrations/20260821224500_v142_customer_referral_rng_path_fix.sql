create or replace function public.get_or_create_customer_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_try integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select code
    into v_code
  from public.customer_referral_codes
  where user_id = v_uid
    and is_active;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_try := v_try + 1;
    v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));

    begin
      insert into public.customer_referral_codes(user_id, code)
      values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      if v_try >= 8 then
        raise exception 'REFERRAL_CODE_CREATE_FAILED';
      end if;
    end;
  end loop;
end;
$$;

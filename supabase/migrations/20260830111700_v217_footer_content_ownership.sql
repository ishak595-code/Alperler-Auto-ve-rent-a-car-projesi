-- V217 footer content ownership. Existing V174 link validation remains canonical.

alter table public.footer_settings
  add column if not exists home_label text not null default 'Ana Sayfa',
  add column if not exists contact_label text not null default 'İletişim',
  add column if not exists phone_label text not null default 'Telefon',
  add column if not exists whatsapp_label text not null default 'WhatsApp',
  add column if not exists default_tagline text not null default 'Kiralama • Satış • Tur',
  add column if not exists whatsapp_default_message text not null default 'Merhaba, Alperler Rent A Car hizmetleri hakkında bilgi almak istiyorum.',
  add column if not exists legal_more_label text not null default 'Diğer yasal bilgiler',
  add column if not exists newsletter_email_label text not null default 'E-posta adresi',
  add column if not exists newsletter_email_placeholder text not null default 'ornek@eposta.com',
  add column if not exists newsletter_free_note text not null default 'Abonelik ücretsizdir.',
  add column if not exists newsletter_legal_label text not null default 'Ticari ileti ve abonelik koşulları',
  add column if not exists newsletter_success_message text not null default 'Aboneliğiniz kaydedildi.',
  add column if not exists newsletter_invalid_email_message text not null default 'Geçerli bir e-posta adresi girin.',
  add column if not exists newsletter_error_message text not null default 'Abonelik şu anda tamamlanamadı. Lütfen tekrar deneyin.',
  add column if not exists copyright_suffix text not null default 'Tüm hakları saklıdır.';

create or replace function public.service_save_footer_bundle_v217(
  p_actor uuid,
  p_settings jsonb,
  p_links jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_base jsonb;
  v_before jsonb;
  v_after jsonb;
  v_links jsonb;
  v_actor_email text;
begin
  if not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode='22023', message='FOOTER_SETTINGS_REQUIRED';
  end if;

  select to_jsonb(f) into v_before
  from public.footer_settings f
  where f.config_key='main';

  -- Reuse the already hardened V174 implementation for legacy fields and all link validation.
  v_base := public.service_save_footer_bundle_v174(p_actor, p_settings, p_links);

  update public.footer_settings set
    home_label = left(coalesce(nullif(btrim(p_settings->>'homeLabel'),''), home_label),80),
    contact_label = left(coalesce(nullif(btrim(p_settings->>'contactLabel'),''), contact_label),80),
    phone_label = left(coalesce(nullif(btrim(p_settings->>'phoneLabel'),''), phone_label),80),
    whatsapp_label = left(coalesce(nullif(btrim(p_settings->>'whatsappLabel'),''), whatsapp_label),80),
    default_tagline = left(coalesce(nullif(btrim(p_settings->>'defaultTagline'),''), default_tagline),180),
    whatsapp_default_message = left(coalesce(nullif(btrim(p_settings->>'whatsappDefaultMessage'),''), whatsapp_default_message),500),
    legal_more_label = left(coalesce(nullif(btrim(p_settings->>'legalMoreLabel'),''), legal_more_label),120),
    newsletter_email_label = left(coalesce(nullif(btrim(p_settings->>'newsletterEmailLabel'),''), newsletter_email_label),100),
    newsletter_email_placeholder = left(coalesce(nullif(btrim(p_settings->>'newsletterEmailPlaceholder'),''), newsletter_email_placeholder),160),
    newsletter_free_note = left(coalesce(nullif(btrim(p_settings->>'newsletterFreeNote'),''), newsletter_free_note),180),
    newsletter_legal_label = left(coalesce(nullif(btrim(p_settings->>'newsletterLegalLabel'),''), newsletter_legal_label),180),
    newsletter_success_message = left(coalesce(nullif(btrim(p_settings->>'newsletterSuccessMessage'),''), newsletter_success_message),220),
    newsletter_invalid_email_message = left(coalesce(nullif(btrim(p_settings->>'newsletterInvalidEmailMessage'),''), newsletter_invalid_email_message),220),
    newsletter_error_message = left(coalesce(nullif(btrim(p_settings->>'newsletterErrorMessage'),''), newsletter_error_message),220),
    copyright_suffix = left(coalesce(nullif(btrim(p_settings->>'copyrightSuffix'),''), copyright_suffix),120),
    updated_at = now()
  where config_key='main';

  select to_jsonb(f) into v_after from public.footer_settings f where f.config_key='main';
  select coalesce(jsonb_agg(to_jsonb(l) order by l.group_key,l.sort_order,l.link_key),'[]'::jsonb)
    into v_links from public.footer_links l where l.config_key='main';
  select email into v_actor_email from auth.users where id=p_actor;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'FOOTER_MICROCOPY_UPDATED_V217','footer_settings','main',v_before,v_after,jsonb_build_object('gateway','site-content-admin-v174','version','v217'));

  return jsonb_build_object('ok',true,'footerSettings',v_after,'footerLinks',v_links,'baseResult',v_base);
end;
$$;

revoke all on function public.service_save_footer_bundle_v217(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.service_save_footer_bundle_v217(uuid,jsonb,jsonb) to service_role;

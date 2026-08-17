create table if not exists public.footer_settings (
  config_key text primary key default 'main',
  is_enabled boolean not null default true,
  brand_summary text not null default 'Araç kiralama, ikinci el satış, transfer ve bölgesel tur hizmetlerini tek yerde planlayın.',
  services_title text not null default 'Hizmetler',
  corporate_title text not null default 'Alperler Auto',
  legal_title text not null default 'Yasal',
  newsletter_enabled boolean not null default true,
  newsletter_title text not null default 'Yeni araç ve fırsatları kaçırmayın',
  newsletter_description text not null default 'Sadece yeni ilan, tur ve kampanya olduğunda haber alın. Abonelik ücretsizdir.',
  newsletter_button_text text not null default 'Ücretsiz Abone Ol',
  show_phone boolean not null default true,
  show_whatsapp boolean not null default true,
  show_social boolean not null default true,
  show_feedback boolean not null default true,
  show_legal_links boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.footer_settings enable row level security;

drop policy if exists footer_settings_public_read on public.footer_settings;
create policy footer_settings_public_read on public.footer_settings
for select to anon, authenticated using (config_key = 'main');

drop policy if exists footer_settings_admin_insert on public.footer_settings;
create policy footer_settings_admin_insert on public.footer_settings
for insert to authenticated with check (private.can_manage_content());

drop policy if exists footer_settings_admin_update on public.footer_settings;
create policy footer_settings_admin_update on public.footer_settings
for update to authenticated using (private.can_manage_content()) with check (private.can_manage_content());

drop policy if exists footer_settings_admin_delete on public.footer_settings;
create policy footer_settings_admin_delete on public.footer_settings
for delete to authenticated using (private.can_manage_content());

insert into public.footer_settings(config_key) values ('main') on conflict (config_key) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.footer_settings;
exception when duplicate_object then null;
end $$;
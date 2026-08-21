drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at before update on public.campaigns for each row execute function private.touch_updated_at();

drop trigger if exists site_config_updated_at on public.site_config;
create trigger site_config_updated_at before update on public.site_config for each row execute function private.touch_updated_at();

drop trigger if exists footer_settings_updated_at on public.footer_settings;
create trigger footer_settings_updated_at before update on public.footer_settings for each row execute function private.touch_updated_at();

drop trigger if exists navigation_items_updated_at on public.navigation_items;
create trigger navigation_items_updated_at before update on public.navigation_items for each row execute function private.touch_updated_at();

drop trigger if exists navigation_settings_updated_at on public.navigation_settings;
create trigger navigation_settings_updated_at before update on public.navigation_settings for each row execute function private.touch_updated_at();

-- V40: catalog media upload policy is client configuration, not a secret.
-- The admin media uploader reads this row before validating files, so it must
-- be visible through the existing site_config public-read policy.

update public.site_config
set is_public = true,
    updated_at = now()
where key = 'catalog_media_policy';

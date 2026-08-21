create index if not exists customer_vault_consents_terms_version_idx on public.customer_vault_consents(terms_version);
create index if not exists customer_vault_terms_updated_by_idx on public.customer_vault_terms(updated_by);

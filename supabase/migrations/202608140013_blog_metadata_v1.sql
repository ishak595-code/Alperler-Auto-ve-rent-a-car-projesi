alter table public.blog_posts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

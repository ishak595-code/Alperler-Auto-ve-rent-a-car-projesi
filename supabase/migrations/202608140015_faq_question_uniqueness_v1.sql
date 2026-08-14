create unique index if not exists faqs_question_lower_uidx
  on public.faqs (lower(question));

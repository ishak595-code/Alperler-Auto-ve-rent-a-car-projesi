-- V81: lock the customer homepage journey to the requested merchandising order.
-- Planner remains the hero. Managed sections begin immediately after it.

update public.homepage_sections set sort_order=5, title='Size Özel Fırsatlar' where section_key='campaigns';
update public.homepage_sections set sort_order=10, title='Kiralık Araçlar' where section_key='rental_featured';
update public.homepage_sections set sort_order=20, title='Satılık Araçlar' where section_key='sale_featured';
update public.homepage_sections set sort_order=30, title='Öne Çıkan Turlar' where section_key='tour_featured';
update public.homepage_sections set sort_order=35, title='Şubelerimiz' where section_key='branches';
update public.homepage_sections set sort_order=40, title='Aracını Değerlendir' where section_key='partner';
update public.homepage_sections set sort_order=50, title='Yola Çıkmadan Önce' where section_key='blog_featured';

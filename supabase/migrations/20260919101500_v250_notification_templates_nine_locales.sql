-- V250: Expand customer notification templates to the full public language set.
-- Fallbacks already live in booking-notify; this unlocks notification_templates lookup for es/ru/zh/ar/ku.

alter table public.notification_templates drop constraint if exists notification_templates_locale_check;
alter table public.notification_templates
  add constraint notification_templates_locale_check
  check (locale = any (array['tr','en','de','fr','es','ru','zh','ar','ku']));

create or replace function public.service_save_notification_template_v221(
  p_actor uuid,
  p_id uuid,
  p_event_key text,
  p_locale text,
  p_subject text,
  p_intro text,
  p_next_step text,
  p_is_active boolean
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $$
declare
  v_row public.notification_templates%rowtype;
  v_event text := lower(btrim(coalesce(p_event_key,'')));
  v_locale text := lower(btrim(coalesce(p_locale,'')));
begin
  if not exists (
    select 1 from public.admin_users a
    where a.user_id = p_actor and a.is_active = true
      and (lower(a.role) in ('owner','admin') or coalesce(a.permissions->>'finance.manage','false') = 'true')
  ) then raise exception 'FINANCE_ADMIN_REQUIRED'; end if;
  if v_event <> all(array['booking_created','booking_pending','booking_approved','booking_rejected','booking_completed','booking_cancelled','payment_received']) then raise exception 'INVALID_NOTIFICATION_EVENT'; end if;
  if v_locale <> all(array['tr','en','de','fr','es','ru','zh','ar','ku']) then raise exception 'INVALID_NOTIFICATION_LOCALE'; end if;
  if char_length(btrim(coalesce(p_subject,''))) not between 3 and 240 then raise exception 'INVALID_NOTIFICATION_SUBJECT'; end if;
  if char_length(btrim(coalesce(p_intro,''))) not between 3 and 3000 then raise exception 'INVALID_NOTIFICATION_INTRO'; end if;
  if char_length(btrim(coalesce(p_next_step,''))) not between 3 and 3000 then raise exception 'INVALID_NOTIFICATION_NEXT_STEP'; end if;

  if p_id is not null then
    update public.notification_templates
       set event_key=v_event, locale=v_locale, audience='CUSTOMER',
           subject_template=btrim(p_subject), intro_template=btrim(p_intro), next_step_template=btrim(p_next_step),
           is_active=coalesce(p_is_active,true), updated_by=p_actor
     where id=p_id and audience='CUSTOMER'
     returning * into v_row;
    if not found then raise exception 'NOTIFICATION_TEMPLATE_NOT_FOUND'; end if;
  else
    insert into public.notification_templates(event_key,audience,locale,subject_template,intro_template,next_step_template,is_active,updated_by)
    values(v_event,'CUSTOMER',v_locale,btrim(p_subject),btrim(p_intro),btrim(p_next_step),coalesce(p_is_active,true),p_actor)
    on conflict(event_key,audience,locale) do update
      set subject_template=excluded.subject_template,
          intro_template=excluded.intro_template,
          next_step_template=excluded.next_step_template,
          is_active=excluded.is_active,
          updated_by=excluded.updated_by
    returning * into v_row;
  end if;
  return jsonb_build_object('ok',true,'template',to_jsonb(v_row));
end;
$$;
revoke all on function public.service_save_notification_template_v221(uuid,uuid,text,text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.service_save_notification_template_v221(uuid,uuid,text,text,text,text,text,boolean) to service_role;

insert into public.notification_templates(event_key,audience,locale,subject_template,intro_template,next_step_template,metadata)
values
('booking_created','CUSTOMER','es','Hemos recibido su solicitud | {{reference}}','Hola {{customer_name}}, hemos recibido su solicitud para {{item_name}} y la registramos con la referencia {{reference}}.','Su solicitud se guardó de forma segura. Nuestro equipo revisará el vehículo, las fechas y los detalles de entrega. Le contactaremos cuando se confirme la disponibilidad. Conserve su número de referencia.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','es','Su solicitud está en revisión | {{reference}}','Hola {{customer_name}}, su reserva {{reference}} está en revisión.','Su solicitud está en revisión activa. No le pedimos un compromiso definitivo hasta aclarar la disponibilidad del vehículo o tour, las fechas y los detalles operativos.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','es','Su reserva está confirmada | {{reference}}','Hola {{customer_name}}, buenas noticias: su reserva {{reference}} para {{item_name}} está confirmada.','Buenas noticias: su reserva está confirmada. Puede seguir los detalles de entrega o encuentro y cualquier paso de pago con esta referencia. Si algo cambia, nuestro equipo le contactará.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','es','Hay una actualización sobre su solicitud | {{reference}}','Hola {{customer_name}}, su solicitud {{reference}} no pudo aprobarse con las condiciones actuales.','Esta solicitud no pudo aprobarse con las condiciones actuales. Puede contactarnos para otro vehículo, fecha o servicio.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','es','Su solicitud se ha completado | {{reference}}','Hola {{customer_name}}, su operación {{reference}} se ha completado.','Su solicitud está completada. Gracias por elegir Alperler Auto. Contáctenos por los mismos canales cuando necesite de nuevo un vehículo, traslado o tour.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','es','Su reserva ha sido cancelada | {{reference}}','Hola {{customer_name}}, su reserva {{reference}} ha sido cancelada.','Su reserva ha sido cancelada. Si desea una nueva fecha u otra opción, cree una nueva solicitud o contacte directamente a nuestro equipo.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','es','Hemos recibido su pago | {{reference}}','Hola {{customer_name}}, recibimos su pago de {{payment_amount}} para la reserva {{reference}}.','Su pago se registró de forma segura en nuestra contabilidad. Puede seguir el saldo actual con esta referencia de reserva.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','ru','Мы получили ваш запрос | {{reference}}','Здравствуйте {{customer_name}}, мы получили ваш запрос на {{item_name}} и сохранили его под номером {{reference}}.','Ваш запрос надёжно сохранён. Наша команда проверит автомобиль, даты и детали передачи. Мы свяжемся с вами, когда подтвердим доступность. Сохраните номер заявки.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','ru','Ваш запрос находится на проверке | {{reference}}','Здравствуйте {{customer_name}}, ваше бронирование {{reference}} сейчас проверяется.','Ваш запрос активно проверяется. Мы не просим вас о окончательном решении, пока не будут ясны доступность автомобиля или тура, даты и операционные детали.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','ru','Ваше бронирование подтверждено | {{reference}}','Здравствуйте {{customer_name}}, хорошие новости: бронирование {{reference}} на {{item_name}} подтверждено.','Хорошие новости: бронирование подтверждено. Детали передачи или встречи и шаги оплаты можно отслеживать по этому номеру. Если что-то изменится, команда свяжется с вами.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','ru','Есть обновление по вашему запросу | {{reference}}','Здравствуйте {{customer_name}}, запрос {{reference}} не удалось подтвердить при текущих условиях.','Этот запрос не удалось подтвердить при текущих условиях. Свяжитесь с нами, чтобы выбрать другой автомобиль, дату или услугу.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','ru','Ваш запрос выполнен | {{reference}}','Здравствуйте {{customer_name}}, операция {{reference}} завершена.','Ваш запрос выполнен. Спасибо, что выбрали Alperler Auto. Обращайтесь к нам по тем же каналам, когда снова понадобится автомобиль, трансфер или тур.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','ru','Ваше бронирование отменено | {{reference}}','Здравствуйте {{customer_name}}, бронирование {{reference}} отменено.','Ваше бронирование отменено. Если нужна новая дата или другой вариант, создайте новый запрос или напрямую свяжитесь с нашей командой.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','ru','Мы получили ваш платёж | {{reference}}','Здравствуйте {{customer_name}}, мы получили ваш платёж {{payment_amount}} по бронированию {{reference}}.','Ваш платёж надёжно зафиксирован в учёте. Текущий баланс можно отслеживать по этому номеру бронирования.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','zh','我们已收到您的申请 | {{reference}}','您好 {{customer_name}}，我们已收到您关于 {{item_name}} 的申请，并已安全记录为参考编号 {{reference}}。','您的申请已安全保存。我们的团队将核对车辆、日期和交车细节。确认可订后我们会与您联系。请妥善保存参考编号。','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','zh','您的申请正在审核中 | {{reference}}','您好 {{customer_name}}，您的预订 {{reference}} 正在审核中。','您的申请正在审核中。在车辆或行程可订情况、日期和运营细节明确之前，我们不会要求您完成最终确认。','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','zh','您的预订已确认 | {{reference}}','您好 {{customer_name}}，好消息：您关于 {{item_name}} 的预订 {{reference}} 已确认。','好消息：您的预订已确认。您可通过此参考编号查看交车或会面细节以及付款步骤。如有变更，我们的团队会与您联系。','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','zh','您的申请有更新 | {{reference}}','您好 {{customer_name}}，根据当前条件，申请 {{reference}} 未能获批。','根据当前条件，此申请未能获批。欢迎联系我们选择其他车辆、日期或服务。','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','zh','您的申请已完成 | {{reference}}','您好 {{customer_name}}，您的业务 {{reference}} 已完成。','您的申请已完成。感谢选择 Alperler Auto。如再次需要车辆、接送或行程，可通过相同渠道联系我们。','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','zh','您的预订已取消 | {{reference}}','您好 {{customer_name}}，您的预订 {{reference}} 已取消。','您的预订已取消。如需新的日期或其他方案，可重新提交申请或直接联系我们的团队。','{"version":1}'::jsonb),
('payment_received','CUSTOMER','zh','我们已收到您的付款 | {{reference}}','您好 {{customer_name}}，我们已收到您针对预订 {{reference}} 的付款 {{payment_amount}}。','您的付款已安全记入账目。您可通过此预订参考编号查看当前余额。','{"version":1}'::jsonb),
('booking_created','CUSTOMER','ar','استلمنا طلبكم | {{reference}}','مرحباً {{customer_name}}، استلمنا طلبكم بخصوص {{item_name}} وسجّلناه تحت المرجع {{reference}}.','تم حفظ طلبكم بأمان. سيراجع فريقنا المركبة والتواريخ وتفاصيل التسليم. سنتواصل معكم عند تأكيد التوفر. يرجى الاحتفاظ برقم المرجع.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','ar','طلبكم قيد المراجعة | {{reference}}','مرحباً {{customer_name}}، حجزكم {{reference}} قيد المراجعة.','طلبكم قيد المراجعة النشطة. لا نطلب منكم التزاماً نهائياً قبل توضيح توفر المركبة أو الجولة والتواريخ والتفاصيل التشغيلية.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','ar','تم تأكيد حجزكم | {{reference}}','مرحباً {{customer_name}}، خبر سار: تم تأكيد حجزكم {{reference}} لـ {{item_name}}.','خبر سار: تم تأكيد حجزكم. يمكنكم متابعة تفاصيل التسليم أو الموعد وأي خطوة دفع عبر هذا المرجع. إذا تغيّر أي تفصيل سيتواصل فريقنا معكم.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','ar','هناك تحديث بخصوص طلبكم | {{reference}}','مرحباً {{customer_name}}، تعذّر اعتماد الطلب {{reference}} وفق الظروف الحالية.','تعذّر اعتماد هذا الطلب وفق الظروف الحالية. يمكنكم التواصل معنا لاختيار مركبة أو تاريخ أو خدمة أخرى.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','ar','اكتمل طلبكم | {{reference}}','مرحباً {{customer_name}}، اكتملت عمليتكم {{reference}}.','اكتمل طلبكم. شكراً لاختياركم Alperler Auto. تواصلوا معنا عبر القنوات نفسها متى احتجتم مركبة أو نقلاً أو جولة مجدداً.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','ar','تم إلغاء حجزكم | {{reference}}','مرحباً {{customer_name}}، تم إلغاء حجزكم {{reference}}.','تم إلغاء حجزكم. إذا رغبتم بتاريخ جديد أو خيار آخر يمكنكم إنشاء طلب جديد أو التواصل مباشرة مع فريقنا.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','ar','استلمنا دفعتكم | {{reference}}','مرحباً {{customer_name}}، استلمنا دفعتكم بمبلغ {{payment_amount}} للحجز {{reference}}.','تم تسجيل دفعتكم بأمان في الحسابات. يمكنكم متابعة الرصيد الحالي عبر مرجع هذا الحجز.','{"version":1}'::jsonb),
('booking_created','CUSTOMER','ku','Daxwaza we hat tomarkirin | {{reference}}','Silav {{customer_name}}, me daxwaza we ji bo {{item_name}} wergirt û bi referansa {{reference}} tomar kir.','Daxwaza we bi ewlehî hate tomarkirin. Tîma me dê erebe, dîrok û hûrguliyên teslîmê kontrol bike. Gava guncawî diyar bibe em ê bi we re têkilî daynin. Hejmara referansa xwe biparêzin.','{"version":1}'::jsonb),
('booking_pending','CUSTOMER','ku','Daxwaza we tê kontrolkirin | {{reference}}','Silav {{customer_name}}, rezervasyona we {{reference}} tê kontrolkirin.','Daxwaza we bi awayekî çalak tê vekolîn. Em ji we gavê dawî naxwazin heta ku guncawiya erebe an gerê, dîrok û hûrguliyên operasyonê zelal bibin.','{"version":1}'::jsonb),
('booking_approved','CUSTOMER','ku','Rezervasyona we hate pejirandin | {{reference}}','Silav {{customer_name}}, nûçeya baş: rezervasyona we {{reference}} ji bo {{item_name}} hate pejirandin.','Nûçeya baş: rezervasyona we hate pejirandin. Hûn dikarin hûrguliyên teslîm an hevdîtinê û gava dravdanê bi vê referansê bişopînin. Heke tiştek biguhere tîma me dê bi we re têkilî dayne.','{"version":1}'::jsonb),
('booking_rejected','CUSTOMER','ku','Nûvekirinek li ser daxwaza we heye | {{reference}}','Silav {{customer_name}}, daxwaza {{reference}} di şertên niha de nehat pejirandin.','Ev daxwaz di şertên niha de nehat pejirandin. Ji bo erebe, dîrok an xizmeteke din dikarin bi me re têkilî daynin.','{"version":1}'::jsonb),
('booking_completed','CUSTOMER','ku','Karê we qediya | {{reference}}','Silav {{customer_name}}, karê we {{reference}} qediya.','Karê we qediya. Spas ji bo hilbijartina Alperler Auto. Dema dîsa erebe, veguhestin an ger hewce be bi heman kanalan bigihin me.','{"version":1}'::jsonb),
('booking_cancelled','CUSTOMER','ku','Rezervasyona we hate betalkirin | {{reference}}','Silav {{customer_name}}, rezervasyona we {{reference}} hate betalkirin.','Rezervasyona we hate betalkirin. Heke dîrokeke nû an vebijarkeke din dixwazin, daxwazeke nû çêbikin an rasterast bi tîma me re têkilî daynin.','{"version":1}'::jsonb),
('payment_received','CUSTOMER','ku','Dravdana we hat wergirtin | {{reference}}','Silav {{customer_name}}, me dravdana we ya {{payment_amount}} ji bo rezervasyona {{reference}} wergirt.','Dravdana we bi ewlehî di tomara hesabê de hate tomarkirin. Hûn dikarin balansa niha bi vê referansa rezervasyonê bişopînin.','{"version":1}'::jsonb)
on conflict (event_key,audience,locale) do nothing;


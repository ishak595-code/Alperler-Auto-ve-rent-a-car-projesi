import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const failures=[];
const must=(source,token,message)=>{if(!source.includes(token))failures.push(message||`Missing: ${token}`);};
const reject=(source,token,message)=>{if(source.includes(token))failures.push(message||`Forbidden: ${token}`);};

const migration=read('supabase/migrations/20260831202105_v2212_transactional_finance_notifications.sql');
const providerMigration=read('supabase/migrations/20260831212332_v2213_notification_provider_vault.sql');
const notifier=read('supabase/functions/booking-notify/index.ts');
const financeEdge=read('supabase/functions/finance-admin/index.ts');
const financeService=read('src/services/finance.service.ts');
const financeAdmin=read('src/pages/admin/admin-finance.component.ts');
const operationsService=read('src/services/admin-operations.service.ts');
const operationsUi=read('src/pages/admin/admin-operations-dashboard.component.ts');
const report=read('api/finance/report.ts');
const bookingGateway=read('supabase/functions/booking-gateway-v166/index.ts');
const operatorDocs=read('docs/notification-provider-setup.md');

for(const token of ['create table if not exists public.notification_templates','alter table public.notification_templates enable row level security','revoke all on table public.notification_templates from anon, authenticated','service_save_notification_template_v221','service_record_offline_payment_v221','for update','PAYMENT_ALREADY_SETTLED','PAYMENT_EXCEEDS_OUTSTANDING','payment_status=case','on conflict do nothing','IYZICO','recordedByActor','todayBookings','todayStarts','todayEnds','officePaymentsDue','eftPaymentsDue',"interval '7 days'"])must(migration,token,`V221.2 database contract missing ${token}`);
for(const token of ['booking_created','booking_pending','booking_approved','booking_rejected','booking_completed','booking_cancelled','payment_received'])must(migration,token,`Notification event seed missing ${token}`);
for(const token of ['paymentMethod==="NONE"?"NOT_REQUIRED":"PENDING"','payment_method:paymentMethod','payment_status:paymentStatus','await notify(saved.id)'])must(bookingGateway,token,`Booking gateway must keep unpaid reservation truth: ${token}`);

for(const token of ['payment_received','notification_templates?event_key=eq.','payment_method,payment_status,amount_paid','paymentMethodLabel','paymentStatusLabel','balance_due','payment_received:${payment.id}','notificationVars','type NoticeMedium','templateFor(event,"CUSTOMER",lang)','paymentNotice(booking,event,lang,context,"sms")','smsChannel(booking,event,deliveryKey,context,twilio)'])must(`${notifier}\n${financeEdge}`,token,`Dynamic email/SMS payment notification contract missing ${token}`);
must(notifier,'Ödeme ofiste yapılacaktır. Bu e-posta rezervasyon kaydınızı doğrular; ödeme makbuzu değildir.','Office-payment email confirmation must never impersonate a receipt.');
must(notifier,'Ödeme ofiste yapılacaktır. Bu mesaj ödeme makbuzu değildir; tahsilat sonrası ayrıca onay gönderilir.','Office-payment SMS must never impersonate a receipt.');
for(const token of ['service_notification_provider_credentials_v2213','resolveResendCredentials','resolveTwilioCredentials','source:\'vault\'','source:\'environment\''])must(notifier,token,`Notification worker must resolve Vault-first credentials with environment fallback: ${token}`);
for(const forbidden of ['innerHTML','bypassSecurityTrustHtml','eval('])reject(notifier,forbidden,`Notification renderer must not execute administrator content: ${forbidden}`);

for(const token of ['service_record_offline_payment_v221','p_actor:admin.id','x-request-id','byCurrency','receivablesByCurrency','pendingReceivablesCount','save_message_template','sendPaymentNotification','service_notification_provider_secret_status_v2213','save_notification_provider','clear_notification_provider','service_set_notification_provider_secrets_v2213','service_clear_notification_provider_secrets_v2213','payment_transaction_id','PAYMENT_LEDGER_REVERSAL_REQUIRED','AUTOMATIC_LEDGER_VOID_FORBIDDEN','VOID_REASON_REQUIRED'])must(financeEdge,token,`Finance edge contract missing ${token}`);
reject(financeEdge,"db('payment_transactions?select=*',{method:'POST'",'Offline payment must use the atomic database RPC, not direct multi-step writes.');

for(const token of ['vault.create_secret','vault.update_secret','vault.decrypted_secrets','service_notification_provider_secret_status_v2213','service_set_notification_provider_secrets_v2213','service_clear_notification_provider_secrets_v2213','service_notification_provider_credentials_v2213','revoke all on function public.service_notification_provider_credentials_v2213(text) from public, anon, authenticated','grant execute on function public.service_notification_provider_credentials_v2213(text) to service_role','secret_values_logged',"'notification_provider_secret'"])must(providerMigration,token,`Notification Vault boundary missing ${token}`);

for(const token of ['FinanceCurrencySummary','byCurrency','receivablesByCurrency','messageTemplates','saveMessageTemplate','FinanceNotificationProviders','notificationProviders','saveResendProvider','saveTwilioProvider','clearNotificationProvider','OfflinePaymentAttempt','offlinePaymentAttempt','fingerprint','requestId:crypto.randomUUID()','this.action({action:\'record_payment\'',"this.offlinePaymentAttempt=null"])must(financeService,token,`Finance client contract missing ${token}`);
reject(financeService,'service_notification_provider_credentials_v2213','Browser service must never read decrypted notification Vault credentials.');
for(const token of ['Dövizler birbirine karıştırılmaz','Açık Alacaklar','Otomatik Müşteri Mesajları','Kullanılabilir değişkenler','payment_received','saveTemplate(template)','money(tx.net_amount,tx.currency)','entry.currency','E-posta ve SMS Bağlantıları','Resend E-posta','Twilio SMS','autocomplete="new-password"','Supabase Vault','saveResend()','saveTwilio()','clearProvider(','providerSource('])must(financeAdmin,token,`Finance admin UI contract missing ${token}`);
reject(financeAdmin,'money(summary().income)','Finance admin must not render a mixed-currency headline total.');
for(const forbidden of ['RESEND_API_KEY','TWILIO_AUTH_TOKEN','service_notification_provider_credentials_v2213'])reject(financeAdmin,forbidden,`Admin browser must not reference server-only notification credential source: ${forbidden}`);

for(const token of ['todayBookings','todayStarts','todayEnds','officePaymentsDue','eftPaymentsDue','upcoming'])must(operationsService,token,`Operations client reminder contract missing ${token}`);
for(const token of ['Bugünün Operasyon Merkezi','Bugün Alınan','Bugün Başlayan','Bugün Biten','Ofiste Tahsilat','EFT Bekleyen','Bugün ve Yaklaşanlar','data.upcoming','routerLink="/admin/finance"'])must(operationsUi,token,`Operations reminder UI missing ${token}`);
reject(operationsUi,'data.revenue | currency','Operations dashboard must not display mixed-currency revenue as TRY.');

for(const token of ['totalsByCurrency','Doviz Bazli Finans Ozeti','Farkli para birimleri birbirine cevrilmeden','money(r.net_amount,r.currency)'])must(report,token,`Currency-safe PDF report missing ${token}`);
reject(report,'let income=0,expense=0,discount=0','PDF must not restore one mixed-currency aggregate.');

for(const token of ['Admin > Muhasebe & Tahsilat','E-posta ve SMS Bağlantıları','Resend','Twilio','Supabase Vault','Ofiste ödeme','ödeme makbuzu','payment_transactions','finance_transactions','notification_deliveries','Messaging Service','Sender Pool','e-posta ve SMS metinleri'])must(operatorDocs,token,`Notification operator documentation missing ${token}`);

if(failures.length){console.error('V221.2 finance/notifications: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('V221.2 finance/notifications: PASS');

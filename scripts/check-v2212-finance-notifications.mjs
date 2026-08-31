import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const failures=[];
const must=(source,token,message)=>{if(!source.includes(token))failures.push(message||`Missing: ${token}`);};
const reject=(source,token,message)=>{if(source.includes(token))failures.push(message||`Forbidden: ${token}`);};

const migration=read('supabase/migrations/20260831202105_v2212_transactional_finance_notifications.sql');
const notifier=read('supabase/functions/booking-notify/index.ts');
const financeEdge=read('supabase/functions/finance-admin/index.ts');
const financeService=read('src/services/finance.service.ts');
const financeAdmin=read('src/pages/admin/admin-finance.component.ts');
const operationsService=read('src/services/admin-operations.service.ts');
const operationsUi=read('src/pages/admin/admin-operations-dashboard.component.ts');
const report=read('api/finance/report.ts');
const bookingGateway=read('supabase/functions/booking-gateway-v166/index.ts');

for(const token of ['create table if not exists public.notification_templates','alter table public.notification_templates enable row level security','revoke all on table public.notification_templates from anon, authenticated','service_save_notification_template_v221','service_record_offline_payment_v221','for update','PAYMENT_ALREADY_SETTLED','PAYMENT_EXCEEDS_OUTSTANDING','payment_status=case','on conflict do nothing','IYZICO','todayBookings','todayStarts','todayEnds','officePaymentsDue','eftPaymentsDue',"interval '7 days'"])must(migration,token,`V221.2 database contract missing ${token}`);
for(const token of ['booking_created','booking_pending','booking_approved','booking_rejected','booking_completed','booking_cancelled','payment_received'])must(migration,token,`Notification event seed missing ${token}`);
for(const token of ['paymentMethod==="NONE"?"NOT_REQUIRED":"PENDING"','payment_method:paymentMethod','payment_status:paymentStatus','await notify(saved.id)'])must(bookingGateway,token,`Booking gateway must keep unpaid reservation truth: ${token}`);

for(const token of ['payment_received','notification_templates?event_key=eq.','payment_method,payment_status,amount_paid','paymentMethodLabel','paymentStatusLabel','balance_due','payment_received:${payment.id}'])must(`${notifier}\n${financeEdge}`,token,`Dynamic payment notification contract missing ${token}`);
must(notifier,'Ödeme ofiste yapılacaktır. Bu e-posta rezervasyon kaydınızı doğrular; ödeme makbuzu değildir.','Office-payment confirmation must never impersonate a receipt.');
for(const forbidden of ['innerHTML','bypassSecurityTrustHtml','eval('])reject(notifier,forbidden,`Notification renderer must not execute administrator content: ${forbidden}`);

for(const token of ['service_record_offline_payment_v221','byCurrency','receivablesByCurrency','pendingReceivablesCount','save_message_template','sendPaymentNotification','recordedByActor'])must(financeEdge,token,`Finance edge contract missing ${token}`);
reject(financeEdge,"db('payment_transactions?select=*',{method:'POST'",'Offline payment must use the atomic database RPC, not direct multi-step writes.');
for(const token of ['FinanceCurrencySummary','byCurrency','receivablesByCurrency','messageTemplates','saveMessageTemplate'])must(financeService,token,`Finance client contract missing ${token}`);
for(const token of ['Dövizler birbirine karıştırılmaz','Açık Alacaklar','Otomatik Müşteri Mesajları','Kullanılabilir değişkenler','payment_received','saveTemplate(template)','money(tx.net_amount,tx.currency)','entry.currency'])must(financeAdmin,token,`Finance admin UI contract missing ${token}`);
reject(financeAdmin,'money(summary().income)','Finance admin must not render a mixed-currency headline total.');

for(const token of ['todayBookings','todayStarts','todayEnds','officePaymentsDue','eftPaymentsDue','upcoming'])must(operationsService,token,`Operations client reminder contract missing ${token}`);
for(const token of ['Bugünün Operasyon Merkezi','Bugün Alınan','Bugün Başlayan','Bugün Biten','Ofiste Tahsilat','EFT Bekleyen','Bugün ve Yaklaşanlar','data.upcoming','routerLink="/admin/finance"'])must(operationsUi,token,`Operations reminder UI missing ${token}`);
reject(operationsUi,'data.revenue | currency','Operations dashboard must not display mixed-currency revenue as TRY.');

for(const token of ['totalsByCurrency','Doviz Bazli Finans Ozeti','Farkli para birimleri birbirine cevrilmeden','money(r.net_amount,r.currency)'])must(report,token,`Currency-safe PDF report missing ${token}`);
reject(report,'let income=0,expense=0,discount=0','PDF must not restore one mixed-currency aggregate.');

if(failures.length){console.error('V221.2 finance/notifications: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('V221.2 finance/notifications: PASS');

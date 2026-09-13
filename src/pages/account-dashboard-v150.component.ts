import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerAccountService, CustomerBooking } from '../services/customer-account.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomerBookingActionsService } from '../services/customer-booking-actions.service';
import { ProfileAdminBridgeService } from '../services/profile-admin-bridge.service';
import { AccountReferralV238Component } from '../components/account-referral-v238.component';
import { UiService } from '../services/ui.service';

type BookingFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CLOSED';

@Component({
  selector: 'app-account-dashboard-v150',
  standalone: true,
  imports: [CommonModule, RouterLink, AccountReferralV238Component],
  template: `
    <main class="account-page">
      <section class="shell">
        <header class="account-header">
          <div class="identity">
            <div class="avatar" aria-hidden="true">
              @if (account.profile()?.avatar_url) { <img [src]="account.profile()?.avatar_url" alt="" /> }
              @else { <span>{{ initials() }}</span> }
            </div>
            <div>
              <p class="eyebrow">{{ t().accountDashboard.eyebrow }}</p>
              <h1>{{ displayName() }}</h1>
              <span>{{ account.profile()?.email || auth.user()?.email }}</span>
            </div>
          </div>
          <div class="header-actions">
            @if (adminBridge.access()) {
              <button type="button" class="admin-entry" (click)="openAdmin()" [disabled]="adminOpening()">{{ adminOpening() ? t().accountDashboard.adminOpening : t().accountDashboard.admin }}</button>
            }
            <a routerLink="/account" [queryParams]="{section:'profile'}">{{ t().accountDashboard.profileSettings }}</a>
            <button type="button" class="logout" (click)="logout()">{{ t().accountDashboard.logout }}</button>
          </div>
        </header>

        @if (pageMessage()) { <p class="notice success" role="status">{{ pageMessage() }}</p> }
        @if (pageError()) { <p class="notice error" role="alert">{{ pageError() }}</p> }

        @if (account.loading()) {
          <section class="loading" role="status">{{ t().accountDashboard.loading }}</section>
        } @else {
          <section class="account-tools" [attr.aria-label]="t().accountDashboard.toolsAria">
            <a routerLink="/fleet"><small>{{ t().accountDashboard.rentKicker }}</small><strong>{{ t().accountDashboard.rentTitle }}</strong></a>
            <a routerLink="/sales"><small>{{ t().accountDashboard.saleKicker }}</small><strong>{{ t().accountDashboard.saleTitle }}</strong></a>
            <a routerLink="/tours"><small>{{ t().accountDashboard.tourKicker }}</small><strong>{{ t().accountDashboard.tourTitle }}</strong></a>
            <a routerLink="/appointment"><small>{{ t().accountDashboard.apptKicker }}</small><strong>{{ t().accountDashboard.apptTitle }}</strong></a>
          </section>

          <app-account-referral-v238 />

          <section class="overview" aria-labelledby="overview-title">
            <header>
              <div><p class="eyebrow">{{ t().accountDashboard.overviewEyebrow }}</p><h2 id="overview-title">{{ t().accountDashboard.overviewTitle }}</h2></div>
              <button type="button" (click)="reload()" [disabled]="account.loading()">{{ t().accountDashboard.refresh }}</button>
            </header>
            <div class="metric-row">
              <button type="button" (click)="toggleLoyalty()" [class.selected]="loyaltyOpen()"><small>{{ t().accountDashboard.points }}</small><strong>{{ account.lifetimeSummary()?.pointsBalance || account.loyalty()?.points_balance || 0 | number }}</strong><span>{{ t().accountDashboard.seeDetail }}</span></button>
              <button type="button" (click)="selectFilter('PENDING')" [class.selected]="bookingFilter()==='PENDING'"><small>{{ t().accountDashboard.reviewing }}</small><strong>{{ countStatus('PENDING') }}</strong><span>{{ t().accountDashboard.openRequests }}</span></button>
              <button type="button" (click)="selectFilter('APPROVED')" [class.selected]="bookingFilter()==='APPROVED'"><small>{{ t().accountDashboard.approved }}</small><strong>{{ countStatus('APPROVED') }}</strong><span>{{ t().accountDashboard.openBookings }}</span></button>
              <button type="button" (click)="selectFilter('ALL')" [class.selected]="bookingFilter()==='ALL'"><small>{{ t().accountDashboard.total }}</small><strong>{{ account.bookings().length }}</strong><span>{{ t().accountDashboard.seeAll }}</span></button>
            </div>
          </section>

          @if (loyaltyOpen() && account.lifetimeSummary(); as lifetime) {
            <section class="loyalty-details" aria-labelledby="loyalty-details-title">
              <header>
                <div><p class="eyebrow">{{ t().accountDashboard.loyaltyEyebrow }}</p><h2 id="loyalty-details-title">{{ t().accountDashboard.tierLevel.replace("{tier}", lifetime.tier) }}</h2><span>{{ tenureLabel() }} · {{ engagementLabel(lifetime.engagementBand) }}</span></div>
                <button type="button" (click)="loyaltyOpen.set(false)">{{ t().accountDashboard.close }}</button>
              </header>
              <div class="loyalty-strip">
                <article><small>{{ t().accountDashboard.rentals }}</small><strong>{{ lifetime.completedRentals }}</strong></article>
                <article><small>{{ t().accountDashboard.tours }}</small><strong>{{ lifetime.completedTours }}</strong></article>
                <article><small>{{ t().accountDashboard.sales }}</small><strong>{{ lifetime.completedSales }}</strong></article>
                <article><small>{{ t().accountDashboard.campaigns }}</small><strong>{{ lifetime.campaignsCompleted }}</strong></article>
                <article><small>{{ t().accountDashboard.referrals }}</small><strong>{{ lifetime.successfulReferrals }}</strong></article>
                <article><small>{{ t().accountDashboard.pointsEarned }}</small><strong>{{ lifetime.pointsEarned | number }}</strong></article>
              </div>
              @if (spendEntries().length) {
                <div class="spend-row">
                  @for (entry of spendEntries(); track entry.currency) {
                    <article><small>{{ spendLabel(entry.currency) }}</small><strong>{{ entry.spent | number:'1.0-2' }} {{ entry.currency }}</strong><span>{{ spendMeta(entry) }}</span></article>
                  }
                </div>
              }
            </section>
          }

          <section id="account-history" class="history" aria-labelledby="history-title">
            <header><div><p class="eyebrow">{{ t().accountDashboard.historyEyebrow }}</p><h2 id="history-title">{{ t().accountDashboard.historyTitle }}</h2><span>{{ t().accountDashboard.historyHint }}</span></div></header>
            <div class="filter-row" role="group" [attr.aria-label]="t().accountDashboard.filtersAria">
              <button type="button" [class.active]="bookingFilter()==='ALL'" (click)="selectFilter('ALL', false)">{{ t().accountDashboard.filterAll }} <b>{{ account.bookings().length }}</b></button>
              <button type="button" [class.active]="bookingFilter()==='PENDING'" (click)="selectFilter('PENDING', false)">{{ t().accountDashboard.filterPending }} <b>{{ countStatus('PENDING') }}</b></button>
              <button type="button" [class.active]="bookingFilter()==='APPROVED'" (click)="selectFilter('APPROVED', false)">{{ t().accountDashboard.filterApproved }} <b>{{ countStatus('APPROVED') }}</b></button>
              <button type="button" [class.active]="bookingFilter()==='COMPLETED'" (click)="selectFilter('COMPLETED', false)">{{ t().accountDashboard.filterCompleted }} <b>{{ countStatus('COMPLETED') }}</b></button>
              <button type="button" [class.active]="bookingFilter()==='CLOSED'" (click)="selectFilter('CLOSED', false)">{{ t().accountDashboard.filterClosed }} <b>{{ closedCount() }}</b></button>
            </div>
            <div class="booking-list">
              @for (booking of filteredBookings(); track booking.id) {
                <article class="booking-item" [class.open]="expandedBooking()===booking.id">
                  <button type="button" class="booking-row" (click)="toggleBooking(booking.id)" [attr.aria-expanded]="expandedBooking()===booking.id">
                    <div class="booking-identity">
                      @if (booking.image) { <img [src]="booking.image" alt="" /> }
                      <div><small>{{ typeLabel(booking.booking_type) }}</small><strong>{{ booking.item_name }}</strong><span>{{ booking.reference }} · {{ booking.created_at | date:'dd.MM.yyyy' }}</span></div>
                    </div>
                    <span class="status" [class]="'status ' + statusClass(booking.status)">{{ statusLabel(booking.status) }}</span>
                    <span class="chevron" aria-hidden="true">{{ expandedBooking()===booking.id ? '−' : '+' }}</span>
                  </button>
                  @if (expandedBooking()===booking.id) {
                    <div class="booking-detail">
                      <p>{{ statusDescription(booking) }}</p>
                      <dl>
                        @if (booking.start_at) { <div><dt>{{ t().accountDashboard.start }}</dt><dd>{{ booking.start_at | date:'dd.MM.yyyy HH:mm' }}</dd></div> }
                        @if (booking.end_at) { <div><dt>{{ t().accountDashboard.end }}</dt><dd>{{ booking.end_at | date:'dd.MM.yyyy HH:mm' }}</dd></div> }
                        @if (booking.total_price !== null && booking.total_price !== undefined) { <div><dt>Tutar</dt><dd>{{ booking.total_price | number:'1.0-2' }} {{ booking.currency }}</dd></div> }
                        <div><dt>{{ t().accountDashboard.payment }}</dt><dd>{{ paymentLabel(booking.payment_status) }}</dd></div>
                      </dl>
                      @if (cancelActions.canCancel(booking.status, booking.start_at)) {
                        @if (cancelConfirm() === booking.reference) {
                          <div class="cancel-confirm" role="group">
                            <p>{{ t().accountDashboard.cancelConfirm }}</p>
                            <div><button type="button" (click)="cancelConfirm.set(null)">{{ t().accountDashboard.cancelDismiss }}</button><button type="button" class="danger" (click)="confirmCancel(booking)" [disabled]="cancelActions.workingReference() === booking.reference">{{ cancelActions.workingReference() === booking.reference ? t().accountDashboard.cancelling : t().accountDashboard.cancelRequest }}</button></div>
                          </div>
                        } @else {
                          <button type="button" class="cancel-button" (click)="cancelConfirm.set(booking.reference)">{{ t().accountDashboard.cancelRequest }}</button>
                        }
                      }
                    </div>
                  }
                </article>
              } @empty {
                <div class="empty"><strong>{{ t().accountDashboard.emptyTitle }}</strong><span>{{ t().accountDashboard.emptyHint }}</span><a routerLink="/">{{ t().accountDashboard.browseServices }}</a></div>
              }
            </div>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.account-page{min-height:100vh;background:#060a12;color:#f4f6f8;padding:clamp(14px,3vw,34px);padding-bottom:calc(100px + env(safe-area-inset-bottom))}.shell{width:min(100%,1180px);margin:auto}.account-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.3rem 0 1rem;border-bottom:1px solid #263548}.identity{display:flex;min-width:0;align-items:center;gap:.75rem}.avatar{display:grid;width:48px;height:48px;flex:none;place-items:center;overflow:hidden;border:1px solid #40516a;border-radius:15px;background:#111c2c;color:#f6d78b;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.eyebrow{margin:0;color:#c6a15b;font-size:.56rem;font-weight:950;letter-spacing:.14em}.account-header h1,.overview h2,.history h2,.loyalty-details h2{margin:.25rem 0 0;font:700 clamp(1.35rem,4vw,2.2rem)/1.06 Georgia,serif}.identity>div>span,.overview header span,.history header span,.loyalty-details header span{display:block;margin-top:.28rem;color:#98a6b8;font-size:.68rem;line-height:1.45}.header-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.38rem}.header-actions a,.header-actions button,.overview header button,.loyalty-details header button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 .72rem;color:#f8fafc;text-decoration:none;font-size:.65rem;font-weight:900}.header-actions .admin-entry{border-color:#b58d42;background:#c6a15b;color:#111827}.header-actions .logout{color:#fda4af}.notice,.loading{margin:.8rem 0 0;border-radius:12px;padding:.75rem .9rem;font-size:.7rem;font-weight:800}.notice.success{background:#0b2d25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #263548;background:#0b1420;color:#a8b4c7}.overview,.history,.loyalty-details{margin-top:.85rem;overflow:hidden;border:1px solid #27364a;border-radius:18px;background:#0b1420}.overview>header,.history>header,.loyalty-details>header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem;border-bottom:1px solid #253448}.overview h2,.history h2,.loyalty-details h2{font-size:1.18rem}.account-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;margin-top:.85rem}.account-tools a{min-width:0;border:1px solid #27364a;border-radius:13px;background:#0b1420;padding:.72rem;color:#fff;text-decoration:none}.account-tools small,.account-tools strong{display:block}.account-tools small{color:#c6a15b;font-size:.5rem;font-weight:950;letter-spacing:.08em}.account-tools strong{margin-top:.18rem;overflow:hidden;text-overflow:ellipsis;font-size:.72rem;white-space:nowrap}.metric-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;padding:.8rem}.metric-row button{min-width:0;border:1px solid #263548;border-radius:13px;background:#09111d;padding:.72rem .55rem;color:#fff;text-align:left}.metric-row button.selected{border-color:#7899b8;background:#101f31}.metric-row small,.metric-row strong,.metric-row span{display:block}.metric-row small{color:#91a0b2;font-size:.55rem;font-weight:850}.metric-row strong{margin-top:.14rem;font-size:1.3rem}.metric-row span{margin-top:.1rem;color:#718096;font-size:.52rem}.loyalty-details{border-color:#6f5930;background:linear-gradient(145deg,#15160f,#0b1420 58%)}.loyalty-strip{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;background:#263548}.loyalty-strip article{background:#0a1320;padding:.7rem}.loyalty-strip small,.loyalty-strip strong{display:block}.loyalty-strip small{color:#93a0b1;font-size:.52rem}.loyalty-strip strong{margin-top:.18rem;color:#f6d78b}.spend-row{display:grid;gap:.5rem;padding:.8rem}.spend-row article{border-radius:11px;background:#101a27;padding:.7rem}.spend-row small,.spend-row strong,.spend-row span{display:block}.spend-row small{color:#c6a15b;font-size:.55rem}.spend-row strong{margin-top:.16rem}.spend-row span{margin-top:.16rem;color:#8493a6;font-size:.56rem}.filter-row{display:flex;gap:.4rem;overflow-x:auto;padding:.7rem .8rem;border-bottom:1px solid #253448;scrollbar-width:none}.filter-row::-webkit-scrollbar{display:none}.filter-row button{display:inline-flex;min-height:38px;flex:none;align-items:center;gap:.35rem;border:1px solid #2c3a4d;border-radius:999px;background:#0e1724;padding:0 .68rem;color:#aab6c5;font-size:.61rem;font-weight:900}.filter-row button.active{border-color:#7899b8;background:#19304a;color:#fff}.filter-row b{display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#263548;color:#fff;font-size:.56rem}.booking-list{display:grid;gap:1px;background:#253448}.booking-item{background:#08111e}.booking-row{display:grid;width:100%;grid-template-columns:minmax(0,1fr) auto 28px;align-items:center;gap:.55rem;border:0;background:#08111e;padding:.72rem .8rem;color:#fff;text-align:left}.booking-item.open .booking-row{background:#0d1826}.booking-identity{display:flex;min-width:0;align-items:center;gap:.6rem}.booking-identity img{width:52px;height:42px;flex:none;border-radius:9px;object-fit:cover}.booking-identity div{min-width:0}.booking-identity small,.booking-identity strong,.booking-identity span{display:block}.booking-identity small{color:#c6a15b;font-size:.5rem;font-weight:950}.booking-identity strong{margin-top:.12rem;overflow:hidden;text-overflow:ellipsis;font-size:.73rem;white-space:nowrap}.booking-identity span{margin-top:.15rem;overflow:hidden;text-overflow:ellipsis;color:#718096;font-size:.54rem;white-space:nowrap}.status{flex:none;border-radius:999px;padding:.3rem .5rem;font-size:.54rem;font-weight:950}.status.pending{background:#30270f;color:#fde68a}.status.approved{background:#0a3024;color:#a7f3d0}.status.completed{background:#102b43;color:#bfdbfe}.status.rejected,.status.cancelled{background:#35131b;color:#fecdd3}.chevron{display:grid;width:28px;height:28px;place-items:center;border-radius:50%;background:#132033;color:#cbd5e1;font-size:1rem}.booking-detail{border-top:1px solid #1e2b3b;background:#0b1420;padding:.75rem .8rem}.booking-detail>p{margin:0;color:#b5c0cf;font-size:.65rem;line-height:1.5}.booking-detail dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;margin:.65rem 0 0}.booking-detail dl>div{border-radius:9px;background:#101a27;padding:.55rem}.booking-detail dt{color:#718096;font-size:.5rem;font-weight:900;text-transform:uppercase}.booking-detail dd{margin:.12rem 0 0;font-size:.6rem;font-weight:850}.cancel-button,.cancel-confirm button{min-height:40px;border:1px solid #5f3340;border-radius:9px;background:transparent;padding:0 .7rem;color:#fda4af;font-size:.61rem;font-weight:900}.cancel-button{margin-top:.65rem}.cancel-confirm{margin-top:.65rem;border:1px solid #59303b;border-radius:10px;background:#1e1117;padding:.65rem}.cancel-confirm p{margin:0;color:#fecdd3;font-size:.64rem}.cancel-confirm>div{display:flex;gap:.4rem;margin-top:.5rem}.cancel-confirm .danger{background:#9f1239;border-color:#9f1239;color:#fff}.empty{display:grid;place-items:start;gap:.4rem;background:#08111e;padding:1.2rem;color:#a7b2c0}.empty strong{color:#fff}.empty span{font-size:.66rem}.empty a{display:inline-flex;min-height:40px;align-items:center;border-radius:9px;background:var(--alper-blue-light);padding:0 .75rem;color:#fff;text-decoration:none;font-size:.63rem;font-weight:900}a:focus-visible,button:focus-visible{outline:3px solid #7899b8;outline-offset:2px}@media(min-width:720px){.spend-row{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:719px){.account-header{display:block}.header-actions{justify-content:flex-start;margin-top:.75rem}.header-actions>*{flex:1 1 auto}.account-tools{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-row{grid-template-columns:repeat(2,minmax(0,1fr))}.loyalty-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.overview>header,.history>header,.loyalty-details>header{align-items:flex-start}.booking-detail dl{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:390px){.account-page{padding-inline:10px}.booking-row{grid-template-columns:minmax(0,1fr) auto 26px;padding-inline:.65rem}.status{max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.booking-identity img{width:46px;height:38px}.loyalty-details>header{display:block}.loyalty-details header button{margin-top:.55rem}}@media(min-width:768px){.account-page{padding-bottom:40px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
})
export class AccountDashboardV150Component implements OnInit {
  private readonly ui = inject(UiService);
  readonly t = this.ui.translations;
  readonly account = inject(CustomerAccountService);
  readonly auth = inject(CustomerAuthService);
  readonly cancelActions = inject(CustomerBookingActionsService);
  readonly adminBridge = inject(ProfileAdminBridgeService);
  private readonly router = inject(Router);

  readonly cancelConfirm = signal<string | null>(null);
  readonly pageMessage = signal('');
  readonly pageError = signal('');
  readonly adminOpening = signal(false);
  readonly loyaltyOpen = signal(false);
  readonly bookingFilter = signal<BookingFilter>('ALL');
  readonly expandedBooking = signal<string | null>(null);
  readonly displayName = computed(() => accountName(this.account.profile()?.full_name, this.auth.user()?.email) || this.t().accountDashboard.fallbackName);
  readonly initials = computed(() => initialsFor(this.displayName()));
  readonly filteredBookings = computed(() => {
    const filter = this.bookingFilter();
    const rows = this.account.bookings();
    if (filter === 'ALL') return rows;
    if (filter === 'CLOSED') return rows.filter((row) => row.status === 'REJECTED' || row.status === 'CANCELLED');
    return rows.filter((row) => row.status === filter);
  });

  async ngOnInit(): Promise<void> {
    await Promise.allSettled([this.reload(), this.adminBridge.refresh()]);
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    try {
      await this.account.refresh();
      if (this.account.partialRefresh()) this.pageError.set(this.t().accountDashboard.partialRefresh);
    } catch {
      this.pageError.set(this.t().accountDashboard.refreshFail);
    }
  }

  toggleLoyalty(): void { this.loyaltyOpen.update((value) => !value); }
  toggleBooking(id: string): void { this.expandedBooking.update((value) => value === id ? null : id); this.cancelConfirm.set(null); }

  selectFilter(filter: BookingFilter, scroll = true): void {
    this.bookingFilter.set(filter);
    this.expandedBooking.set(null);
    this.cancelConfirm.set(null);
    if (scroll && typeof document !== 'undefined') globalThis.setTimeout(() => document.getElementById('account-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  countStatus(status: string): number { return this.account.bookings().filter((row) => row.status === status).length; }
  closedCount(): number { return this.account.bookings().filter((row) => row.status === 'REJECTED' || row.status === 'CANCELLED').length; }
  tenureLabel(): string { const value=this.account.lifetimeSummary();if(!value)return'';const D=this.t().accountDashboard;if(value.tenureFullYears>0)return D.tenureYears.replace('{years}', String(value.tenureFullYears)).replace('{months}', String(value.tenureMonths%12));return D.tenureMonths.replace('{months}', String(value.tenureMonths)); }
  engagementLabel(value:string):string{const D=this.t().accountDashboard;if(value==='LONG_TERM')return D.engLong;if(value==='LOYAL')return D.engLoyal;if(value==='REGULAR')return D.engRegular;return D.engNew;}
  spendEntries():Array<{currency:string;spent:number;saved:number;transactions:number}>{const spend=this.account.lifetimeSummary()?.spendByCurrency||{};return Object.entries(spend).map(([currency,row])=>({currency,spent:Number(row.spent||0),saved:Number(row.saved||0),transactions:Number(row.transactions||0)})).sort((a,b)=>b.spent-a.spent);}
  typeLabel(value:string):string{const D=this.t().accountDashboard;if(value==='RENTAL')return D.typeRental;if(value==='TOUR')return D.typeTour;if(value==='SALE_INQUIRY')return D.typeSale;if(value==='APPOINTMENT')return D.typeAppt;return D.typeGeneric;}
  statusLabel(value:string):string{const D=this.t().accountDashboard;if(value==='APPROVED')return D.statusApproved;if(value==='REJECTED')return D.statusRejected;if(value==='COMPLETED')return D.statusCompleted;if(value==='CANCELLED')return D.statusCancelled;return D.statusPending;}
  statusClass(value:string):string{if(value==='APPROVED')return'approved';if(value==='REJECTED')return'rejected';if(value==='COMPLETED')return'completed';if(value==='CANCELLED')return'cancelled';return'pending';}
  paymentLabel(value:string):string{const D=this.t().accountDashboard;if(value==='PAID')return D.payPaid;if(value==='REFUNDED')return D.payRefunded;if(value==='FAILED')return D.payFailed;return value==='PENDING'?D.payPending:value||D.payUnknown;}
  statusDescription(booking:CustomerBooking):string{const D=this.t().accountDashboard;if(booking.status==='APPROVED')return D.descApproved;if(booking.status==='REJECTED')return D.descRejected;if(booking.status==='COMPLETED')return D.descCompleted;if(booking.status==='CANCELLED')return D.descCancelled;return D.descPending;}

  async confirmCancel(booking:CustomerBooking):Promise<void>{this.pageMessage.set('');this.pageError.set('');try{await this.cancelActions.cancel(booking.reference);this.cancelConfirm.set(null);this.pageMessage.set(this.t().accountDashboard.cancelSuccess);await this.account.refresh();}catch(error){this.pageError.set(error instanceof Error?error.message:this.t().accountDashboard.cancelFail);}}
  async openAdmin():Promise<void>{if(this.adminOpening())return;this.adminOpening.set(true);this.pageError.set('');try{await this.adminBridge.openAdmin();}catch(error){this.pageError.set(error instanceof Error?error.message:this.t().accountDashboard.adminFail);this.adminOpening.set(false);}}
  async logout():Promise<void>{await this.auth.logout();this.account.clearLocalProfile();void this.router.navigate(['/account/login']);}
}

function accountName(fullName?:string|null,email?:string|null):string{const name=String(fullName||'').trim();if(name)return name;const local=String(email||'').split('@')[0].replace(/[._-]+/g,' ').trim();return local?local.replace(/\b\w/g,(letter)=>letter.toLocaleUpperCase('tr-TR')):'';}
function initialsFor(value:string):string{return value.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part.charAt(0).toLocaleUpperCase('tr-TR')).join('')||'A';}
import { Component, ElementRef, HostListener, NgZone, OnDestroy, afterNextRender, effect, inject, signal, viewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { CustomerAuthService } from "../services/customer-auth.service";
import { CustomerAccountService } from "../services/customer-account.service";
import { Language, UiService } from "../services/ui.service";
import { NavigationConfigService } from "../services/navigation-config.service";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  host: { "[class.nav-collapsed]": "navCollapsed()" },
  template: `
    <nav class="site-navbar" [attr.aria-label]="t().nav.mainAria">
      <div class="navbar-shell">
        <div class="navbar-row">
          <a routerLink="/" [attr.aria-label]="t().nav.homeAria" class="brand-link">
            @if (config().logoUrl) {
              <img [src]="config().logoUrl" [alt]="brandLabel()" class="brand-logo" />
            } @else {
              <span class="brand-lockup">
                <span class="brand-mark" aria-hidden="true">A</span>
                <span class="brand-copy"><strong class="brand-name">{{ brandLabel() }}</strong><small class="brand-sub">{{ t().nav.brandSub }}</small></span>
              </span>
            }
          </a>

          <div #desktopNav class="desktop-nav" [attr.aria-label]="t().nav.desktopMenuAria" [attr.aria-hidden]="navCollapsed() ? 'true' : null">
            @for (item of navigation.itemsFor('MOBILE_MENU'); track item.id) {
              <a [routerLink]="item.route" [routerLinkActiveOptions]="{ exact: item.route === '/' }" routerLinkActive="nav-link-active" class="nav-link" [attr.aria-label]="navLabel(item)">{{ navLabel(item) }}</a>
            }
          </div>

          <div class="navbar-actions">
            <button type="button" (click)="toggleLangMenu()" [attr.aria-label]="t().nav.languageSelect" [attr.aria-expanded]="isLangMenuOpen()" class="desktop-control language-trigger">{{ uiService.currentLang() }}</button>
            @if (isLangMenuOpen()) {
              <div role="menu" class="language-menu">
                @for (lang of languages; track lang) { <button type="button" role="menuitem" (click)="setLang(lang)" class="language-option">{{ langName(lang) }}</button> }
              </div>
            }
            <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" [attr.aria-label]="t().common.favorites" class="desktop-control icon-control"><mat-icon aria-hidden="true">favorite_border</mat-icon></a>

            @if (!customerAuth.isLoggedIn()) {
              <a routerLink="/account/login" [attr.aria-label]="t().nav.loginRegisterAria" class="auth-entry">
                <mat-icon aria-hidden="true">person_outline</mat-icon><span>{{ t().nav.loginRegister }}</span>
              </a>
            } @else {
              <a routerLink="/account" [attr.aria-label]="t().nav.myAccount" class="account-entry">
                @if (customerAccount.profile()?.avatar_url) { <img class="account-avatar" [src]="customerAccount.profile()?.avatar_url" alt="" aria-hidden="true" /> } @else { <mat-icon aria-hidden="true">account_circle</mat-icon> }
                <span>{{ accountLabel() }}</span>
              </a>
            }

            @if (navigation.mobileMenuEnabled()) {
              <button id="mobile-menu-trigger" type="button" (click)="toggleMenu()" [attr.aria-label]="isMenuOpen() ? t().nav.closeMenu : t().nav.openMenu" [attr.aria-expanded]="isMenuOpen()" [attr.aria-controls]="isMenuOpen() ? 'mobile-navigation' : null" class="mobile-menu-trigger"><mat-icon aria-hidden="true">{{ isMenuOpen() ? 'close' : 'menu' }}</mat-icon></button>
            }
          </div>
        </div>
      </div>
    </nav>

    @if (navigation.mobileMenuEnabled() && isMenuOpen()) {
      <nav id="mobile-navigation" [attr.aria-label]="t().nav.mobileNavAria" class="mobile-navigation">
        <div class="mobile-menu-shell">
          <div class="mobile-menu-intro"><p class="menu-kicker">{{ brandLabel() }}</p><p>{{ t().nav.mobileIntro }}</p></div>
          <div class="mobile-menu-card">
            @for (item of navigation.itemsFor('MOBILE_MENU'); track item.id; let first=$first; let last=$last) {
              <a [id]="first ? 'mobile-menu-first-link' : null" [routerLink]="item.route" (click)="closeMenu(false)" class="menu-row" [class.last]="last" [attr.aria-label]="navLabel(item)"><mat-icon aria-hidden="true">{{ item.icon }}</mat-icon><span>{{ navLabel(item) }}</span></a>
            }
          </div>
          <div class="mobile-menu-card mobile-account-card" [attr.aria-label]="t().nav.personalSettings">
            <a [routerLink]="customerAuth.isLoggedIn() ? '/account' : '/account/login'" (click)="closeMenu(false)" class="menu-row" [attr.aria-label]="customerAuth.isLoggedIn() ? t().nav.myAccount : t().nav.loginRegisterAria">
              @if (customerAuth.isLoggedIn() && customerAccount.profile()?.avatar_url) { <img class="menu-avatar" [src]="customerAccount.profile()?.avatar_url" alt="" aria-hidden="true" /> } @else { <mat-icon aria-hidden="true">{{ customerAuth.isLoggedIn() ? 'account_circle' : 'person_outline' }}</mat-icon> }
              <span>{{ customerAuth.isLoggedIn() ? accountLabel() : t().nav.loginRegisterLong }}</span>
            </a>
            <a routerLink="/fleet" [queryParams]="{ favs:'true' }" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">favorite_border</mat-icon><span>{{ t().common.favorites }}</span>@if (favoriteCount() > 0) { <strong class="menu-count" [attr.aria-label]="favoritesCountLabel()">{{ favoriteCount() > 99 ? '99+' : favoriteCount() }}</strong> }</a>
            <button type="button" class="menu-row last" (click)="toggleMobileLanguage()" [attr.aria-expanded]="mobileLanguageOpen()" aria-controls="mobile-language-options"><mat-icon aria-hidden="true">language</mat-icon><span>{{ t().nav.language }}: {{ langName(uiService.currentLang()) }}</span><mat-icon aria-hidden="true" class="expand-icon" [class.expanded]="mobileLanguageOpen()">expand_more</mat-icon></button>
            @if (mobileLanguageOpen()) {
              <div id="mobile-language-options" class="mobile-language-grid" [attr.aria-label]="t().nav.languageOptions">
                @for (lang of languages; track lang) { <button type="button" (click)="setMobileLang(lang)" [attr.aria-pressed]="uiService.currentLang()===lang" class="mobile-language-option"><strong>{{ lang }}</strong><span>{{ langName(lang) }}</span></button> }
              </div>
            }
            <a routerLink="/admin/login" (click)="closeMenu(false)" class="menu-row admin-entry" [attr.aria-label]="t().nav.adminLogin"><mat-icon aria-hidden="true">admin_panel_settings</mat-icon><span>{{ t().nav.adminLogin }}</span></a>
          </div>
        </div>
      </nav>
    }
  `,
  styles: [`
    :host{display:block}.site-navbar{position:fixed;inset:0 0 auto;z-index:100;height:72px;border-bottom:1px solid color-mix(in srgb,var(--alper-border,#303846) 70%,transparent);background:color-mix(in srgb,var(--alper-bg,#07101f) 92%,#000);color:var(--alper-text,#fff);box-shadow:var(--alper-shadow,0 10px 28px rgba(2,6,23,.24));backdrop-filter:blur(10px)}.navbar-shell{width:min(100% - 1rem,1280px);height:100%;margin-inline:auto}.navbar-row{display:flex;height:100%;min-width:0;align-items:center;justify-content:space-between;gap:.45rem}.brand-link{display:flex;min-width:0;flex:1;align-items:center;border-radius:10px;color:#fff;text-decoration:none}.brand-link:focus-visible,.auth-entry:focus-visible,.account-entry:focus-visible,.mobile-menu-trigger:focus-visible,.desktop-control:focus-visible{outline:2px solid #E15A62;outline-offset:2px}.brand-lockup{display:flex;min-width:0;align-items:center;gap:.55rem}.brand-mark{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:12px;background:var(--alper-gold,#c6a15b);color:#111827;font-size:1.2rem;font-weight:950;box-shadow:0 10px 28px rgba(0,0,0,.28)}.brand-copy{display:block;min-width:0}.brand-name{display:block;overflow:hidden;color:#fff;font-family:var(--alper-heading-font,Playfair Display,Georgia,serif);font-size:13px;font-weight:600;line-height:1.05;letter-spacing:.035em;text-overflow:ellipsis;white-space:nowrap}.brand-sub{display:block;overflow:hidden;margin-top:3px;color:#94a3b8;font-size:7px;font-weight:900;line-height:1.2;letter-spacing:.11em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.brand-logo{display:block;max-width:min(52vw,220px);max-height:52px;width:auto;height:auto;object-fit:contain}.desktop-nav,.desktop-control{display:none}.navbar-actions{position:relative;display:flex;flex:0 0 auto;align-items:center;gap:.2rem}.auth-entry,.account-entry,.mobile-menu-trigger,.desktop-control{min-height:44px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);color:#f8fafc;text-decoration:none}.auth-entry,.account-entry{display:grid;width:44px;place-items:center}.auth-entry span,.account-entry span{display:none}.auth-entry mat-icon,.account-entry mat-icon,.mobile-menu-trigger mat-icon{width:24px;height:24px;font-size:24px}.account-avatar,.menu-avatar{width:30px;height:30px;flex:0 0 30px;border:1px solid rgba(255,255,255,.18);border-radius:999px;object-fit:cover}.mobile-menu-trigger{display:grid;width:44px;padding:0;place-items:center;cursor:pointer}.language-menu{position:absolute;right:0;top:52px;z-index:140;width:168px;max-height:min(420px,70vh);overflow:auto;border:1px solid #334155;border-radius:14px;background:#0b1526;padding:5px;box-shadow:0 20px 50px rgba(2,6,23,.4)}.language-option{display:block;width:100%;min-height:44px;border:0;border-radius:9px;background:transparent;padding:8px 11px;color:#e2e8f0;text-align:left;font-size:13px;font-weight:700}.language-option:hover,.language-option:focus-visible{background:rgba(255,255,255,.07);outline:none}.mobile-navigation{position:fixed;inset:72px 0 0;z-index:95;overflow-y:auto;overscroll-behavior:contain;background:#050b16;color:#fff;touch-action:pan-y;-webkit-overflow-scrolling:touch}.mobile-menu-shell{width:min(100% - 1rem,620px);margin-inline:auto;padding:16px 0 calc(6.5rem + env(safe-area-inset-bottom))}.mobile-menu-intro{padding:0 5px 12px}.mobile-menu-intro p{margin:4px 0 0;color:#94a3b8;font-size:13px;line-height:1.55}.mobile-menu-intro .menu-kicker{margin:0;color:var(--alper-gold,#d5b449);font-size:10px;font-weight:950;letter-spacing:.18em;text-transform:uppercase}.mobile-menu-card{overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#0b1526;box-shadow:0 18px 44px rgba(2,6,23,.35)}.mobile-account-card{margin-top:14px}.menu-row{display:flex;width:100%;min-height:58px;align-items:center;gap:15px;border:0;border-bottom:1px solid rgba(255,255,255,.1);background:transparent;padding:0 16px;color:#f1f5f9;text-align:left;text-decoration:none;font-size:15px;font-weight:750;touch-action:manipulation}.menu-row span{min-width:0;flex:1}.menu-row.last{border-bottom:0}.menu-row:hover,.menu-row:focus-visible{background:rgba(255,255,255,.055);outline:none}.menu-count{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:#101a2e;padding:0 8px;color:#e2e8f0;font-size:11px;font-weight:900}.expand-icon{transition:transform .16s ease}.expand-icon.expanded{transform:rotate(180deg)}.mobile-language-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;border-top:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.1);padding:12px}.mobile-language-option{min-height:50px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:rgba(255,255,255,.035);padding:7px 10px;color:#f1f5f9;text-align:left}.mobile-language-option strong{display:block;color:#94a3b8;font-size:10px;letter-spacing:.08em}.mobile-language-option span{display:block;margin-top:2px;font-size:12px;font-weight:750}.admin-entry{border-top:1px solid rgba(198,161,91,.32);color:#f6d78b}.admin-entry mat-icon{color:#d5b449}
    @media(min-width:420px){.navbar-shell{width:min(100% - 1.5rem,1280px)}.brand-name{font-size:14px}.brand-sub{font-size:7.5px}.navbar-actions{gap:.35rem}.auth-entry,.account-entry{display:flex;width:auto;max-width:138px;padding:0 10px;gap:6px}.auth-entry span,.account-entry span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;font-weight:900}}
    @media(min-width:640px){.brand-lockup{gap:.7rem}.brand-mark{width:46px;height:46px;flex-basis:46px}.brand-name{font-size:16px}.brand-sub{font-size:8px}.mobile-language-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(min-width:768px){.site-navbar{height:84px}.mobile-navigation{inset:84px 0 0}.brand-logo{max-height:62px}.brand-name{font-size:17px}.brand-sub{font-size:8.5px}.auth-entry,.account-entry{min-height:46px}.mobile-menu-trigger{width:46px;min-height:46px}}
    @media(min-width:1280px){.site-navbar{height:96px}.navbar-shell{width:min(100% - 3rem,1280px)}.brand-link{flex:0 1 auto;min-width:172px;max-width:285px}.brand-logo{max-width:280px;max-height:72px}.desktop-nav{display:flex;min-width:0;min-height:45px;flex:1 1 0%;align-items:center;justify-content:space-between;gap:.5rem;overflow-x:auto;overflow-y:hidden;padding:.3rem .65rem;scrollbar-width:none}.desktop-nav::-webkit-scrollbar{display:none}.nav-link{flex:none;border-bottom:2px solid transparent;padding:.55rem 0;color:#cbd5e1;text-decoration:none;font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.nav-link:hover{color:#fff}.nav-link-active{border-color:var(--alper-blue-light,#E15A62);color:#fff}.desktop-control{display:grid;place-items:center}.language-trigger{min-width:44px;padding:0 8px;font-size:11px;font-weight:900}.icon-control{width:44px}.mobile-menu-trigger{display:none}.auth-entry,.account-entry{display:flex;min-height:44px;width:auto;max-width:150px;padding:0 10px;gap:7px}.mobile-navigation{display:none!important}:host(.nav-collapsed) .desktop-nav{visibility:hidden;pointer-events:none}:host(.nav-collapsed) .mobile-menu-trigger{display:grid}:host(.nav-collapsed) .mobile-navigation{display:block!important;inset:96px 0 0}}
    @media(display-mode:standalone) and (pointer:coarse), (display-mode:fullscreen) and (pointer:coarse){.site-navbar{padding-top:env(safe-area-inset-top);height:calc(72px + env(safe-area-inset-top))}.mobile-navigation{inset:calc(72px + env(safe-area-inset-top)) 0 0}}@media(display-mode:standalone) and (pointer:coarse) and (min-width:768px), (display-mode:fullscreen) and (pointer:coarse) and (min-width:768px){.site-navbar{height:calc(84px + env(safe-area-inset-top))}.mobile-navigation{inset:calc(84px + env(safe-area-inset-top)) 0 0}}
    @media(prefers-reduced-motion:reduce){.expand-icon{transition:none}}
  `],
})
export class NavbarComponent implements OnDestroy {
  carService=inject(CarService);customerAuth=inject(CustomerAuthService);customerAccount=inject(CustomerAccountService);uiService=inject(UiService);t=this.uiService.translations;navigation=inject(NavigationConfigService);router=inject(Router);config=this.carService.getConfig();favoriteCount=this.carService.getFavoriteCount;
  isMenuOpen=signal(false);isLangMenuOpen=signal(false);mobileLanguageOpen=signal(false);
  /** V250: desktop links collapse into the menu whenever they cannot fit on one row (any language, admin label or width). */
  navCollapsed=signal(false);
  private readonly desktopNav=viewChild<ElementRef<HTMLElement>>("desktopNav");
  private readonly zone=inject(NgZone);
  private navResizeObserver?:ResizeObserver;private navMutationObserver?:MutationObserver;private navFitFrame=0;languages:Language[]=["TR","EN","DE","FR","KU","ES","RU","ZH","AR"];
  constructor(){
    effect(()=>{if(!this.navigation.mobileMenuEnabled())this.closeMenu(false);});
    effect(()=>{if(this.customerAuth.isLoggedIn())void this.customerAccount.refreshProfileSummary();else this.customerAccount.clearLocalProfile();});
    this.router.events.subscribe(event=>{if(event instanceof NavigationEnd)this.closeMenu(false);});
    effect(()=>{this.navigation.mobileMenuEnabled();this.t();this.scheduleNavFit();});
    afterNextRender(()=>this.observeDesktopNav());
  }
  ngOnDestroy():void{this.setDocumentMenuOpen(false);this.navResizeObserver?.disconnect();this.navMutationObserver?.disconnect();if(this.navFitFrame&&typeof window!=="undefined")window.cancelAnimationFrame(this.navFitFrame);}
  accountLabel():string{const fullName=String(this.customerAccount.profile()?.full_name||'').trim();return fullName?fullName.split(/\s+/)[0]:this.t().nav.myAccount;}
  favoritesCountLabel():string{return String(this.t().nav.favoritesCount||'').replace('{n}', String(this.favoriteCount()));}
  toggleMenu():void{this.isMenuOpen()?this.closeMenu(false):this.openMenu();}
  openMenu():void{if(this.isMenuOpen())return;this.isLangMenuOpen.set(false);this.mobileLanguageOpen.set(false);this.isMenuOpen.set(true);this.setDocumentMenuOpen(true);this.focusElement("mobile-menu-first-link");}
  closeMenu(restoreFocus=false):void{if(!this.isMenuOpen()){this.setDocumentMenuOpen(false);return;}this.isMenuOpen.set(false);this.mobileLanguageOpen.set(false);this.setDocumentMenuOpen(false);if(restoreFocus)this.focusElement("mobile-menu-trigger");}
  toggleLangMenu():void{if(!this.isMenuOpen())this.isLangMenuOpen.update(v=>!v);}closeLangMenu():void{this.isLangMenuOpen.set(false);}toggleMobileLanguage():void{this.mobileLanguageOpen.update(v=>!v);}setLang(lang:Language):void{this.uiService.setLanguage(lang);this.closeLangMenu();}setMobileLang(lang:Language):void{this.uiService.setLanguage(lang);this.mobileLanguageOpen.set(false);}
  async onGlobalSearch(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const query=input.value.trim();if(!query)return;const vehicle=this.carService.getVehicleByAdId(query);if(vehicle)await this.router.navigate([vehicle.category==="SALE"?"/sales":"/fleet",vehicle.id]);else await this.router.navigate(["/fleet"],{queryParams:{search:query}});input.value="";this.closeMenu(false);}
  navLabel(item:{itemKey:string;label:string}):string{return this.uiService.publicNavLabel(item.itemKey,item.label,"MOBILE_MENU");}
  brandLabel():string{return String(this.config().companyName || this.t().common.siteBrandFallback || "Alperler Rent A Car").trim();}
  langName(lang:Language):string{return({TR:"Türkçe",EN:"English",DE:"Deutsch",FR:"Français",KU:"Kurdî",ES:"Español",RU:"Русский",ZH:"中文",AR:"العربية"} as Record<Language,string>)[lang];}
  private setDocumentMenuOpen(open:boolean):void{if(typeof document==="undefined")return;if(open)document.documentElement.dataset["mobileMenuOpen"]="true";else delete document.documentElement.dataset["mobileMenuOpen"];}
  private focusElement(id:string):void{if(typeof window==="undefined"||typeof document==="undefined")return;window.requestAnimationFrame(()=>(document.getElementById(id) as HTMLElement|null)?.focus({preventScroll:true}));}
  @HostListener("document:keydown.escape")onEscape():void{this.closeLangMenu();this.closeMenu(true);}@HostListener("window:resize")onResize():void{this.scheduleNavFit();if(typeof window!=="undefined"&&window.innerWidth>=1280&&!this.navCollapsed())this.closeMenu(false);}
  private observeDesktopNav():void{
    const nav=this.desktopNav()?.nativeElement;if(!nav||typeof window==="undefined")return;
    this.zone.runOutsideAngular(()=>{
      if(typeof ResizeObserver!=="undefined"){this.navResizeObserver=new ResizeObserver(()=>this.scheduleNavFit());this.navResizeObserver.observe(nav);}
      if(typeof MutationObserver!=="undefined"){this.navMutationObserver=new MutationObserver(()=>this.scheduleNavFit());this.navMutationObserver.observe(nav,{childList:true,subtree:true,characterData:true});}
    });
    void document.fonts?.ready.then(()=>this.scheduleNavFit());
    this.scheduleNavFit();
  }
  private scheduleNavFit():void{if(typeof window==="undefined")return;if(this.navFitFrame)window.cancelAnimationFrame(this.navFitFrame);this.navFitFrame=window.requestAnimationFrame(()=>{this.navFitFrame=0;this.fitDesktopNav();});}
  /** The collapsed link row stays in layout (visibility:hidden), so its natural width is always measurable.
   *  Room for it = current slot, plus the menu button's slot when collapsed (the button disappears on expand). */
  private fitDesktopNav():void{
    const nav=this.desktopNav()?.nativeElement;if(!nav||typeof window==="undefined")return;
    const style=window.getComputedStyle(nav);
    let overflowing=false;
    if(style.display!=="none"){
      const links=Array.from(nav.children) as HTMLElement[];
      const gap=parseFloat(style.columnGap)||0;
      const required=links.reduce((width,link)=>width+link.getBoundingClientRect().width,0)+gap*Math.max(0,links.length-1)+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
      let available=nav.clientWidth;
      if(this.navCollapsed()){
        const trigger=document.getElementById("mobile-menu-trigger");
        if(trigger?.parentElement)available+=trigger.getBoundingClientRect().width+(parseFloat(window.getComputedStyle(trigger.parentElement).columnGap)||0);
        overflowing=required>available-2;
      }else{
        overflowing=required>available+.5||nav.scrollWidth-nav.clientWidth>1;
      }
    }
    const collapse=overflowing&&this.navigation.mobileMenuEnabled();
    if(collapse===this.navCollapsed())return;
    this.zone.run(()=>{this.navCollapsed.set(collapse);if(!collapse&&window.innerWidth>=1280)this.closeMenu(false);});
  }
}

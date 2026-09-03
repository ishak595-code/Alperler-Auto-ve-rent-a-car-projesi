from pathlib import Path

# Navbar: secure admin login entry at the bottom of the hamburger account card.
p = Path('src/components/navbar.component.ts')
s = p.read_text()
anchor = '''            @if (mobileLanguageOpen()) {
              <div id="mobile-language-options" class="mobile-language-grid" aria-label="Dil seçenekleri">
                @for (lang of languages; track lang) { <button type="button" (click)="setMobileLang(lang)" [attr.aria-pressed]="uiService.currentLang()===lang" class="mobile-language-option"><strong>{{ lang }}</strong><span>{{ langName(lang) }}</span></button> }
              </div>
            }
'''
replacement = anchor + '''            <a routerLink="/admin/login" (click)="closeMenu(false)" class="menu-row admin-entry" aria-label="Yönetici girişi"><mat-icon aria-hidden="true">admin_panel_settings</mat-icon><span>Yönetici Girişi</span></a>
'''
if anchor not in s:
    raise SystemExit('navbar admin entry anchor missing')
s = s.replace(anchor, replacement, 1)
style_anchor = '.mobile-language-option span{display:block;margin-top:2px;font-size:12px;font-weight:750}'
if style_anchor not in s:
    raise SystemExit('navbar style anchor missing')
s = s.replace(style_anchor, style_anchor + '.admin-entry{border-top:1px solid rgba(198,161,91,.32);color:#f6d78b}.admin-entry mat-icon{color:#d5b449}', 1)
p.write_text(s)

# Admin auth recovery must return to the admin password-set screen.
p = Path('src/services/auth.service.ts')
s = p.read_text()
old = '''    try {
      const redirectTo = `${window.location.origin}/account/login?recovery=1&returnUrl=${encodeURIComponent('/admin')}`;
      const response = await fetch(
'''
new = '''    try {
      const redirectTo = `${this.adminLoginRedirect()}?recovery=1`;
      const response = await fetch(
'''
if old not in s:
    raise SystemExit('admin reset redirect anchor missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Admin login: explicit first-access password creation action without bypassing auth.
p = Path('src/pages/admin/admin-login.component.ts')
s = p.read_text()
old = '''            <div class="mt-4 flex justify-start text-xs font-black"><button type="button" (click)="setMode('forgot')" class="min-h-11 text-slate-700 hover:underline">Şifremi unuttum</button></div>
'''
new = '''            <div class="mt-4 grid gap-2 text-xs font-black sm:grid-cols-2"><button type="button" (click)="doFirstAccess()" [disabled]="isLoading()" class="min-h-11 rounded-xl border border-amber-200 bg-amber-50 px-3 text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">İlk giriş / Şifremi oluştur</button><button type="button" (click)="setMode('forgot')" class="min-h-11 rounded-xl px-3 text-slate-700 hover:bg-slate-50 hover:underline">Şifremi unuttum</button></div>
            <p class="mt-3 text-xs leading-relaxed text-slate-500">İlk girişte mevcut şifreyi bilmeniz gerekmez. Güvenli bağlantı yalnız kayıtlı ana yönetici e-posta adresine gönderilir.</p>
'''
if old not in s:
    raise SystemExit('admin first access button anchor missing')
s = s.replace(old, new, 1)
method_anchor = '''  async doReset(): Promise<void> {
'''
method = '''  async doFirstAccess(): Promise<void> {
    if (this.isLoading()) return;
    this.errorMsg.set(""); this.successMsg.set("");
    this.isLoading.set(true);
    const success = await this.authService.resetPassword(this.authService.getPrimaryAdminEmail());
    this.isLoading.set(false);
    if (!success) { this.syncError("İlk yönetici şifresi oluşturma bağlantısı gönderilemedi."); return; }
    this.successMsg.set("İlk giriş bağlantısı kayıtlı ana yönetici e-posta adresine gönderildi. Bağlantıyı açıp yeni şifrenizi belirleyin.");
  }

'''
if method_anchor not in s:
    raise SystemExit('admin doReset method anchor missing')
s = s.replace(method_anchor, method + method_anchor, 1)
p.write_text(s)

# Harden V238 regression: admin link exists, first-access uses recovery only, no passwordless bypass.
p = Path('scripts/check-v238-profile-navigation-integrity.mjs')
s = p.read_text()
read_anchor = "const migration=read('supabase/migrations/20260903002500_v238_remove_duplicate_mobile_menu_search.sql');\n"
reads = "const navbar=read('src/components/navbar.component.ts');\nconst adminLogin=read('src/pages/admin/admin-login.component.ts');\nconst adminAuth=read('src/services/auth.service.ts');\n"
if read_anchor not in s:
    raise SystemExit('V238 read anchor missing')
s = s.replace(read_anchor, read_anchor + reads, 1)
end_anchor = "assert(migration.includes(\"surface = 'MOBILE_MENU'\")&&migration.includes(\"item_key = 'search'\")&&migration.includes('archived_at'),'migration does not archive mobile-menu Search');\n"
checks = (
    "assert(navbar.includes('routerLink=\\\"/admin/login\\\"')&&navbar.includes('Yönetici Girişi'),'hamburger admin login entry missing');\n"
    "assert(adminLogin.includes('İlk giriş / Şifremi oluştur')&&adminLogin.includes('doFirstAccess()'),'secure first admin access action missing');\n"
    "assert(adminAuth.includes('`${this.adminLoginRedirect()}?recovery=1`'),'admin password recovery does not return to admin password-set flow');\n"
    "for(const forbidden of ['passwordlessAdmin','bypassAdmin','skipAdminAuth','adminWithoutPassword']) assert(!navbar.includes(forbidden)&&!adminLogin.includes(forbidden)&&!adminAuth.includes(forbidden),`unsafe admin bypass marker present: ${forbidden}`);\n"
)
if end_anchor not in s:
    raise SystemExit('V238 check anchor missing')
s = s.replace(end_anchor, end_anchor + checks, 1)
p.write_text(s)

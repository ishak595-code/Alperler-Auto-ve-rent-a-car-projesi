#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const authService = `import { Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

@Injectable({ providedIn: "root" })
export class AuthService {
  private _isLoggedIn = signal(false);
  private _userEmail = signal<string | null>(null);
  private _authReady = signal(false);
  private readonly primaryAdminEmail = "ishak595@gmail.com";
  private readyResolver!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.readyResolver = resolve;
  });

  constructor(private router: Router) {
    onAuthStateChanged(auth, async (user) => {
      const allowed = await this.isAllowedUser(user);

      if (user && allowed) {
        this._isLoggedIn.set(true);
        this._userEmail.set(user.email);
      } else {
        this._isLoggedIn.set(false);
        this._userEmail.set(null);
        if (user) {
          await signOut(auth).catch(() => undefined);
        }
      }

      if (!this._authReady()) {
        this._authReady.set(true);
        this.readyResolver();
      }
    });
  }

  get isLoggedIn() {
    return this._isLoggedIn.asReadonly();
  }

  async waitUntilReady(): Promise<void> {
    if (this._authReady()) return;
    await this.readyPromise;
  }

  private async isAllowedUser(user: User | null): Promise<boolean> {
    if (!user?.email) return false;
    const normalizedEmail = user.email.trim().toLowerCase();
    if (normalizedEmail === this.primaryAdminEmail) return true;

    try {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      return adminDoc.exists();
    } catch (error) {
      console.error("Admin authorization check failed", error);
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return false;

    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (!(await this.isAllowedUser(result.user))) {
        await signOut(auth);
        return false;
      }
      this._isLoggedIn.set(true);
      this._userEmail.set(result.user.email);
      return true;
    } catch (error) {
      console.error("Admin email/password login failed", error);
      return false;
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      if (!(await this.isAllowedUser(result.user))) {
        await signOut(auth);
        return false;
      }

      this._isLoggedIn.set(true);
      this._userEmail.set(result.user.email);
      return true;
    } catch (error) {
      console.error("Admin Google login failed", error);
      return false;
    }
  }

  async createStrongPasswordForCurrentUser(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user?.email) return null;
    if (user.providerData.some((provider) => provider.providerId === "password")) {
      return null;
    }

    const password = this.generateStrongPassword();
    const credential = EmailAuthProvider.credential(user.email, password);
    await linkWithCredential(user, credential);
    return password;
  }

  private generateStrongPassword(): string {
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const symbols = "!@#$%*+-_?";
    const all = lower + upper + digits + symbols;
    const pick = (chars: string) => {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return chars[bytes[0] % chars.length];
    };

    const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
    for (let i = chars.length; i < 24; i += 1) chars.push(pick(all));

    for (let i = chars.length - 1; i > 0; i -= 1) {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      const j = bytes[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
  }

  getCurrentEmail(): string {
    return this._userEmail() || auth.currentUser?.email || this.primaryAdminEmail;
  }

  async logout() {
    this._isLoggedIn.set(false);
    this._userEmail.set(null);
    await signOut(auth).catch(() => undefined);
    this.router.navigate(["/admin/login"]);
  }

  async resetPassword(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return false;
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return true;
    } catch (error) {
      console.error("Admin password reset failed", error);
      return false;
    }
  }
}
`;
await writeFile('src/services/auth.service.ts', authService, 'utf8');

// Make route protection wait for Firebase auth restoration instead of trusting localStorage.
{
  const path = 'src/app.routes.ts';
  let s = await readFile(path, 'utf8');
  const oldGuard = `const adminGuard: CanActivateFn = () => {\n  const auth = inject(AuthService);\n  const router = inject(Router);\n  if (auth.isLoggedIn()) {\n    return true;\n  }\n  return router.parseUrl('/admin/login');\n};`;
  const newGuard = `const adminGuard: CanActivateFn = async () => {\n  const auth = inject(AuthService);\n  const router = inject(Router);\n  await auth.waitUntilReady();\n  if (auth.isLoggedIn()) {\n    return true;\n  }\n  return router.parseUrl('/admin/login');\n};`;
  if (!s.includes(newGuard)) {
    if (!s.includes(oldGuard)) throw new Error('admin guard source not found');
    s = s.replace(oldGuard, newGuard);
  }
  await writeFile(path, s, 'utf8');
}

// Firebase rules: the verified primary admin email can bootstrap securely without a plaintext browser password.
{
  const path = 'firestore.rules';
  let s = await readFile(path, 'utf8');
  const oldFn = `    function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }`;
  const newFn = `    function isAdmin() {\n      return isSignedIn() && (\n        request.auth.token.email == 'ishak595@gmail.com' ||\n        exists(/databases/$(database)/documents/admins/$(request.auth.uid))\n      );\n    }`;
  if (!s.includes(newFn)) {
    if (!s.includes(oldFn)) throw new Error('isAdmin rule source not found');
    s = s.replace(oldFn, newFn);
  }
  await writeFile(path, s, 'utf8');
}

// Login UI: improve labels and, after the first authorized Google login, generate a one-time strong password locally and link it to Firebase.
{
  const path = 'src/pages/admin/admin-login.component.ts';
  let s = await readFile(path, 'utf8');

  s = s.replace(
    '<input type="email" [(ngModel)]="username" name="username" class=',
    '<input type="email" [(ngModel)]="username" name="username" autocomplete="username" inputmode="email" aria-label="Yönetici e-posta adresi" class=',
  );
  s = s.replace(
    '<input [type]="showPassword() ? \'text\' : \'password\'" [(ngModel)]="password" name="password" class=',
    '<input [type]="showPassword() ? \'text\' : \'password\'" [(ngModel)]="password" name="password" autocomplete="current-password" aria-label="Yönetici şifresi" class=',
  );
  s = s.replace(
    '<button type="button" (click)="togglePasswordVisibility()" class=',
    '<button type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="showPassword() ? \'Şifreyi gizle\' : \'Şifreyi göster\'" class=',
  );

  const loginIf = `              @if (!showForgotPass) {`;
  const generatedPanel = `              @if (generatedPassword()) {\n                  <div role="status" aria-live="polite" class="space-y-5">\n                    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">\n                      <h3 class="font-bold text-lg mb-2">Güçlü yönetici şifreniz oluşturuldu</h3>\n                      <p class="text-sm leading-relaxed">Bu şifre Firebase hesabınıza güvenli biçimde bağlandı. Şifre GitHub koduna veya tarayıcı localStorage alanına kaydedilmedi. Aşağıdaki şifreyi şimdi güvenli bir yere kaydedin.</p>\n                    </div>\n                    <label for="generatedAdminPassword" class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Yeni yönetici şifresi</label>\n                    <div class="flex gap-2">\n                      <input id="generatedAdminPassword" [value]="generatedPassword()" readonly aria-label="Yeni yönetici şifresi" class="min-w-0 flex-1 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-slate-900" />\n                      <button type="button" (click)="copyGeneratedPassword()" class="min-h-12 px-4 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Kopyala</button>\n                    </div>\n                    <button type="button" (click)="continueToDashboard()" class="w-full min-h-14 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Şifreyi Kaydettim, Panele Geç</button>\n                  </div>\n              } @else if (!showForgotPass) {`;
  if (!s.includes(generatedPanel)) {
    if (!s.includes(loginIf)) throw new Error('login form conditional not found');
    s = s.replace(loginIf, generatedPanel);
  }

  s = s.replace(
    `  resetSuccess = signal(false);`,
    `  resetSuccess = signal(false);\n  generatedPassword = signal('');`,
  );

  const oldGoogle = `    if (success) {\n      this.router.navigate(['/admin/dashboard']);\n    } else {\n      this.errorMsg.set('Yetkisiz giriş denemesi veya işlem iptal edildi.');\n    }`;
  const newGoogle = `    if (success) {\n      try {\n        const generated = await this.authService.createStrongPasswordForCurrentUser();\n        if (generated) {\n          this.generatedPassword.set(generated);\n          return;\n        }\n      } catch (error) {\n        console.warn('Strong password creation is unavailable; Google login remains active.', error);\n      }\n      this.router.navigate(['/admin/dashboard']);\n    } else {\n      this.errorMsg.set('Yetkisiz giriş denemesi veya işlem iptal edildi.');\n    }`;
  if (!s.includes(newGoogle)) {
    if (!s.includes(oldGoogle)) throw new Error('Google login result block not found');
    s = s.replace(oldGoogle, newGoogle);
  }

  const toggleAnchor = `  toggleForgot() {`;
  const helpers = `  async copyGeneratedPassword() {\n    const value = this.generatedPassword();\n    if (!value) return;\n    try {\n      await navigator.clipboard.writeText(value);\n    } catch {\n      this.errorMsg.set('Şifre kopyalanamadı. Metni seçip kopyalayabilirsiniz.');\n    }\n  }\n\n  continueToDashboard() {\n    this.generatedPassword.set('');\n    this.router.navigate(['/admin/dashboard']);\n  }\n\n  toggleForgot() {`;
  if (!s.includes(helpers)) {
    if (!s.includes(toggleAnchor)) throw new Error('toggleForgot anchor not found');
    s = s.replace(toggleAnchor, helpers);
  }

  await writeFile(path, s, 'utf8');
}

console.log('Secure Firebase admin authentication, verified admin rules and one-time strong-password setup applied.');

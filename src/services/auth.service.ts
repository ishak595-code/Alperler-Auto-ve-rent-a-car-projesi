import { Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

@Injectable({ providedIn: "root" })
export class AuthService {
  private _isLoggedIn = signal(false);
  private _userEmail = signal<string | null>(null);
  private _authReady = signal(false);
  private _lastErrorCode = signal<string | null>(null);
  private _lastErrorMessage = signal<string | null>(null);

  private readonly primaryAdminEmail = "ishak595@gmail.com";
  private readyResolver!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.readyResolver = resolve;
  });

  constructor(private router: Router) {
    auth.useDeviceLanguage();

    onAuthStateChanged(auth, async (user) => {
      const allowed = await this.isAllowedUser(user);

      if (user && allowed) {
        this._isLoggedIn.set(true);
        this._userEmail.set(user.email);
      } else {
        this._isLoggedIn.set(false);
        this._userEmail.set(null);
        if (user) await signOut(auth).catch(() => undefined);
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

  get lastErrorCode() {
    return this._lastErrorCode.asReadonly();
  }

  get lastErrorMessage() {
    return this._lastErrorMessage.asReadonly();
  }

  async waitUntilReady(): Promise<void> {
    if (this._authReady()) return;
    await this.readyPromise;
  }

  private clearError() {
    this._lastErrorCode.set(null);
    this._lastErrorMessage.set(null);
  }

  private captureError(error: unknown, fallback: string) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";

    this._lastErrorCode.set(code || "auth/unknown");
    this._lastErrorMessage.set(this.friendlyAuthError(code, fallback));
    console.error(fallback, error);
  }

  private friendlyAuthError(code: string, fallback: string): string {
    switch (code) {
      case "auth/unauthorized-domain":
        return "Bu site adresi Firebase yetkili alan adlarına eklenmemiş. Sabit Vercel alan adını Firebase Authentication > Settings > Authorized domains bölümüne ekleyin.";
      case "auth/popup-blocked":
        return "Tarayıcı Google giriş penceresini engelledi. Açılır pencere iznini etkinleştirip tekrar deneyin.";
      case "auth/popup-closed-by-user":
        return "Google giriş penceresi tamamlanmadan kapatıldı.";
      case "auth/cancelled-popup-request":
        return "Aynı anda birden fazla Google giriş isteği oluştu. Bir kez daha deneyin.";
      case "auth/operation-not-allowed":
        return "Bu giriş yöntemi Firebase Authentication içinde etkin değil. Google ve Email/Password sağlayıcılarının açık olması gerekiyor.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "E-posta veya şifre doğrulanamadı.";
      case "auth/too-many-requests":
        return "Çok fazla başarısız giriş denemesi yapıldı. Güvenlik nedeniyle kısa süre sonra tekrar deneyin.";
      case "auth/network-request-failed":
        return "Ağ bağlantısı nedeniyle Firebase'e ulaşılamadı.";
      case "auth/requires-recent-login":
        return "Bu güvenlik işlemi için yeniden giriş yapmanız gerekiyor.";
      default:
        return fallback;
    }
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
    this.clearError();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      this._lastErrorMessage.set("E-posta ve şifre alanlarını doldurun.");
      return false;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (!(await this.isAllowedUser(result.user))) {
        await signOut(auth);
        this._lastErrorMessage.set("Bu hesap yönetici yetkisine sahip değil.");
        return false;
      }
      this._isLoggedIn.set(true);
      this._userEmail.set(result.user.email);
      return true;
    } catch (error) {
      this.captureError(error, "Yönetici e-posta/şifre girişi başarısız oldu.");
      return false;
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    this.clearError();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: this.primaryAdminEmail,
      });

      const result = await signInWithPopup(auth, provider);
      if (!(await this.isAllowedUser(result.user))) {
        await signOut(auth);
        this._lastErrorMessage.set("Seçilen Google hesabı yönetici olarak yetkili değil.");
        return false;
      }

      this._isLoggedIn.set(true);
      this._userEmail.set(result.user.email);
      return true;
    } catch (error) {
      this.captureError(error, "Google ile yönetici girişi tamamlanamadı.");
      return false;
    }
  }

  async createStrongPasswordForCurrentUser(): Promise<string | null> {
    this.clearError();
    const user = auth.currentUser;
    if (!user?.email) return null;

    const password = this.generateStrongPassword();
    try {
      await updatePassword(user, password);
      return password;
    } catch (error) {
      this.captureError(error, "Yönetici şifresi oluşturulamadı.");
      return null;
    }
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
    while (chars.length < 24) chars.push(pick(all));

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

  getPrimaryAdminEmail(): string {
    return this.primaryAdminEmail;
  }

  async logout() {
    this._isLoggedIn.set(false);
    this._userEmail.set(null);
    await signOut(auth).catch(() => undefined);
    this.router.navigate(["/admin/login"]);
  }

  async resetPassword(email: string): Promise<boolean> {
    this.clearError();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return false;

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return true;
    } catch (error) {
      this.captureError(error, "Şifre sıfırlama e-postası gönderilemedi.");
      return false;
    }
  }
}

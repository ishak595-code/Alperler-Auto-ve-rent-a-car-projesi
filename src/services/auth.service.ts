
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _isLoggedIn = signal<boolean>(false);
  private _userEmail = signal<string | null>(null);
  
  private defaultAllowedEmails = ['ishak595@gmail.com', 'ramcofero.yt@gmail.com'];

  constructor(private router: Router) {
    // Check local storage for persistence across reloads (offline login)
    const storedAuth = localStorage.getItem('adminAuth');
    if (storedAuth === 'true') {
      this._isLoggedIn.set(true);
      this._userEmail.set(localStorage.getItem('adminUser') || 'ishak595@gmail.com');
    }
    
    // Initialize default credentials if not set
    const envUser = (typeof process !== 'undefined' && process.env && process.env['ADMIN_USER']) || '';
    const envPass = (typeof process !== 'undefined' && process.env && process.env['ADMIN_PASS']) || '';

    if (!localStorage.getItem('adminUser')) {
        localStorage.setItem('adminUser', envUser || 'ishak595@gmail.com');
    }
    if (!localStorage.getItem('adminPass')) {
        localStorage.setItem('adminPass', envPass || 'i4h4k5a2');
    }

    auth.onAuthStateChanged(async (user) => {
      if (user) {
         let allowedEmails = this.defaultAllowedEmails;
         try {
            const configDoc = await getDoc(doc(db, 'config', 'main'));
            if (configDoc.exists()) {
                const data = configDoc.data();
                if (data && Array.isArray(data['adminEmails'])) {
                    allowedEmails = data['adminEmails'];
                }
            }
         } catch (e) {
            console.error("Error fetching allowed emails", e);
         }

         if (allowedEmails.includes(user.email || '')) {
            this._isLoggedIn.set(true);
            this._userEmail.set(user.email);
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminUser', user.email || '');
         } else {
            console.warn('Unauthorized email:', user.email);
            signOut(auth);
         }
      }
    });
  }

  get isLoggedIn() {
    return this._isLoggedIn.asReadonly();
  }

  async login(username: string, pass: string): Promise<boolean> {
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!username || !pass) return false;

    // Normalize inputs
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Get stored credentials
    const validUser = localStorage.getItem('adminUser') || 'ishak595@gmail.com';
    const validPass = localStorage.getItem('adminPass') || 'i4h4k5a2';

    // DIRECT BYPASS - No Firebase for email/password as it might be disabled
    if (cleanUser === validUser && cleanPass === validPass) {
      this._isLoggedIn.set(true);
      this._userEmail.set(cleanUser);
      localStorage.setItem('adminAuth', 'true');
      return true;
    }
    
    return false;
  }

  async loginWithGoogle(): Promise<boolean> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      let allowedEmails = this.defaultAllowedEmails;
      try {
        const configDoc = await getDoc(doc(db, 'config', 'main'));
        if (configDoc.exists() && Array.isArray(configDoc.data()['adminEmails'])) {
            allowedEmails = configDoc.data()['adminEmails'];
        }
      } catch(e) {}

      if (result.user && allowedEmails.includes(result.user.email || '')) {
         this._isLoggedIn.set(true);
         this._userEmail.set(result.user.email);
         localStorage.setItem('adminAuth', 'true');
         return true;
      } else {
         alert('Bu e-posta adresinin yetkisi yok: ' + result.user.email);
         await signOut(auth);
         return false;
      }
    } catch (e) {
      console.error('Google login err', e);
      return false;
    }
  }

  verifyCredentials(pass: string): boolean {
      const cleanPass = pass.trim();
      const validPass = localStorage.getItem('adminPass') || 'i4h4k5a2';
      return cleanPass === validPass;
  }

  getCurrentEmail(): string {
      return this._userEmail() || localStorage.getItem('adminUser') || 'ishak595@gmail.com';
  }

  updateCredentials(newUser: string, newPass: string) {
      localStorage.setItem('adminUser', newUser.trim().toLowerCase());
      localStorage.setItem('adminPass', newPass.trim());
      return true;
  }

  async logout() {
    this._isLoggedIn.set(false);
    this._userEmail.set(null);
    localStorage.removeItem('adminAuth');
    try {
      await signOut(auth);
    } catch(e) {}
    this.router.navigate(['/admin/login']);
  }
  
  async resetPassword(email: string): Promise<boolean> {
     try {
       await sendPasswordResetEmail(auth, email);
       return true;
     } catch (e) {
       console.error('Reset error', e);
       // Check offline user
       if(email && email.includes('@')) { return true; }
       return false;
     }
  }
}

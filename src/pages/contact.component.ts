import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CarService, BookingRequest } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { ToastService } from "../services/toast.service";
import { MatIconModule } from "@angular/material/icon";
import { db, auth } from "../firebase";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore operation failed", { error: errInfo.error, operationType, path });
  throw new Error(errInfo.error);
}

@Component({
  selector: "app-contact",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="font-sans min-h-screen bg-slate-950 text-slate-300 pb-20 overflow-x-hidden">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="min-h-16 flex items-center gap-2 sm:gap-3 py-2">
            <button
              (click)="goBack()"
              class="w-11 h-11 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-base sm:text-lg font-bold text-white min-w-0 break-words">
              {{
                bookingData()
                  ? bookingData()?.type === "RENTAL"
                    ? "Ödeme & Rezervasyon"
                    : "Talep Oluştur"
                  : "İletişim"
              }}
            </h1>
          </div>
        </div>
      </div>

      <!-- ==========================
            FULL SCREEN CHECKOUT MODE
            ========================== -->
      @if (bookingData()) {
        <div class="animate-fade-in">
          <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- RENTAL WIZARD -->
            @if (bookingData()?.type === "RENTAL") {
              <!-- STEP 1: RENTAL DETAILS -->
              @if (currentStep() === 1) {
                <div
                  class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in"
                >
                  <div
                    class="bg-slate-900 text-white p-4 sm:p-6 flex justify-between items-center gap-3"
                  >
                    <h2 class="text-xl sm:text-2xl font-bold font-serif leading-tight">
                      1. Kiralama Detayları
                    </h2>
                    <span class="text-blue-500 text-xs sm:text-base font-bold shrink-0">Adım 1/3</span>
                  </div>

                  <div class="p-4 sm:p-8">
                    <div
                      class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 pb-8 border-b border-slate-100"
                    >
                      <img
                        [src]="bookingData()?.image"
                        class="w-full sm:w-32 h-44 sm:h-24 object-cover rounded-xl shadow-md"
                        alt="Kiralık Araç/Ürün Resmi"
                      />
                      <div>
                        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                          {{ bookingData()?.itemName }}
                        </h3>
                        <p class="text-slate-500">
                          Günlük: {{ bookingData()?.basePrice | number }} ₺
                        </p>
                      </div>
                    </div>

                    <div class="space-y-6 mb-8">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label
                            for="rental_duration_select"
                            class="text-xs font-bold text-slate-500 uppercase block mb-2"
                            >Kiralama Türü</label
                          >
                          <select
                            id="rental_duration_select"
                            [(ngModel)]="rentalDuration"
                            (change)="calculatePrice()"
                            class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="hourly">Saatlik</option>
                            <option value="daily">Günlük</option>
                            <option value="monthly">Aylık</option>
                            <option value="longterm">Uzun Dönem</option>
                          </select>
                        </div>
                          <!-- Driver option moved -->
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        @if (rentalDuration === "hourly") {
                          <div>
                            <label for="rent_date_hourly" class="text-xs font-bold text-slate-500 uppercase block mb-2">Tarih</label>
                            <input
                              id="rent_date_hourly"
                              type="date"
                              [(ngModel)]="startDate"
                              (change)="calculatePrice()"
                              class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label for="rent_hours" class="text-xs font-bold text-slate-500 uppercase block mb-2">Kaç Saat?</label>
                            <div class="flex items-center">
                              <input
                                id="rent_hours"
                                type="number"
                                min="1"
                                max="23"
                                [(ngModel)]="selectedHours"
                                (change)="calculatePrice()"
                                class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        } @else {
                          <div>
                            <label for="rent_start_date" class="text-xs font-bold text-slate-500 uppercase block mb-2">Alış Tarihi</label>
                            <input
                              id="rent_start_date"
                              type="date"
                              [(ngModel)]="startDate"
                              (change)="calculatePrice()"
                              class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label for="rent_end_date" class="text-xs font-bold text-slate-500 uppercase block mb-2">Dönüş Tarihi</label>
                            <input
                              id="rent_end_date"
                              type="date"
                              [(ngModel)]="endDate"
                              (change)="calculatePrice()"
                              class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        }
                      </div>
                    </div>

                    <!-- NOTES & DRIVER OPTIONS -->
                    <div class="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 mb-8">
                      <h4 class="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                        <mat-icon class="text-blue-500 text-[18px] w-[18px] h-[18px]">add_circle</mat-icon> Notlar
                      </h4>
                      <div class="space-y-4">
                         <div>
                            <label for="reservation_notes" class="text-xs font-bold text-slate-500 uppercase block mb-2">Bize İletmek İstediğiniz Not (Varsa)</label>
                            <textarea
                              id="reservation_notes"
                              [(ngModel)]="reservationNotes"
                              rows="3"
                              class="w-full min-h-28 bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                              placeholder="Örn: Araç havalimanına teslim edilsin."
                            ></textarea>
                         </div>
                      </div>
                    </div>

                    <div class="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 mb-8">
                      <h4 class="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                        <mat-icon class="text-blue-500 text-[18px] w-[18px] h-[18px]">add_circle</mat-icon> Ek Hizmetler (İsteğe Bağlı)
                      </h4>
                      <div class="relative">
                        <button 
                          type="button"
                          (click)="extrasDropdownOpen.set(!extrasDropdownOpen())" 
                          class="w-full min-h-12 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center justify-between font-bold text-sm hover:border-blue-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label="Ekstra seçenekleri aç/kapat"
                          aria-haspopup="listbox"
                          [attr.aria-expanded]="extrasDropdownOpen()"
                        >
                          <span class="text-slate-700">Ekstra Seçenekler Ekle</span>
                          <mat-icon class="text-slate-400" [class.rotate-180]="extrasDropdownOpen()">expand_more</mat-icon>
                        </button>
                        
                        @if (extrasDropdownOpen()) {
                          <div class="absolute z-20 mt-2 w-full max-h-[min(60dvh,24rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <ul role="listbox" aria-label="Ekstra seçenekler" class="max-h-60 overflow-y-auto">
                              <li>
                                <label class="flex items-center justify-between cursor-pointer p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                  <div class="flex items-center gap-3">
                                    <input type="checkbox" aria-label="Bebek Koltuğu Seç" [(ngModel)]="wantsChildSeat" (change)="calculatePrice()" class="form-checkbox h-5 w-5 text-blue-500 rounded focus:ring-blue-500" />
                                    <div>
                                        <span class="text-sm font-bold text-slate-700 block">Bebek Koltuğu</span>
                                        <span class="text-xs text-slate-500">Güvenli yolculuk için (Günlük {{childSeatPriceDaily}} ₺)</span>
                                    </div>
                                  </div>
                                </label>
                              </li>
                              <li>
                                <label class="flex items-center justify-between cursor-pointer p-4 hover:bg-slate-50 transition-colors">
                                  <div class="flex items-center gap-3">
                                    <input type="checkbox" aria-label="Tam Kapsamlı Sigorta Seç" [(ngModel)]="wantsInsurance" (change)="calculatePrice()" class="form-checkbox h-5 w-5 text-blue-500 rounded focus:ring-blue-500" />
                                    <div>
                                        <span class="text-sm font-bold text-slate-700 block">Tam Kapsamlı Sigorta Mini Hasar Paketi</span>
                                        <span class="text-xs text-slate-500">Kafanız rahat olsun (Günlük {{insurancePriceDaily}} ₺)</span>
                                    </div>
                                  </div>
                                </label>
                              </li>
                            </ul>
                          </div>
                        }
                      </div>

                      <!-- Extracted Services Summary List -->
                      @if (wantsChildSeat || wantsInsurance) {
                        <div class="mt-4 p-4 bg-white border border-slate-100 rounded-xl space-y-2">
                           <p class="text-xs font-bold text-slate-500 mb-2 uppercase">Seçilen Ekstralar:</p>
                           @if (wantsChildSeat) {
                             <div class="flex justify-between items-center text-sm font-medium text-slate-700">
                               <div class="flex items-center gap-2"><mat-icon class="text-blue-500 text-[16px] w-[16px] h-[16px]">child_care</mat-icon> Bebek Koltuğu</div>
                               <button (click)="wantsChildSeat = false; calculatePrice()" aria-label="Bebek Koltuğunu Çıkar" class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon></button>
                             </div>
                           }
                           @if (wantsInsurance) {
                             <div class="flex justify-between items-center text-sm font-medium text-slate-700">
                               <div class="flex items-center gap-2"><mat-icon class="text-blue-500 text-[16px] w-[16px] h-[16px]">security</mat-icon> Tam Kapsamlı Sigorta</div>
                               <button (click)="wantsInsurance = false; calculatePrice()" aria-label="Sigortayı Çıkar" class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon></button>
                             </div>
                           }
                        </div>
                      }
                      <div class="mt-6"></div>

                      <div
                        class="flex justify-between items-center text-sm text-slate-600 mb-2"
                      >
                        <span>Süre</span>
                        <span class="font-bold">
                          @if (rentalDuration === "hourly") {
                            {{ selectedHours }} Saat
                          } @else {
                            {{ totalDays() }} Gün
                          }
                        </span>
                      </div>
                      <div
                        class="border-t border-slate-200 pt-4 mt-4 flex justify-between items-center"
                      >
                        <span class="font-bold text-lg text-slate-900"
                          >Toplam Tutar</span
                        >
                        <span class="font-bold text-3xl text-blue-600"
                          >{{ totalPrice() | number }} ₺</span
                        >
                      </div>
                    </div>

                    <button
                      (click)="currentStep.set(2)"
                      [disabled]="!startDate || (rentalDuration !== 'hourly' && !endDate) || (rentalDuration === 'hourly' && selectedHours < 1)"
                      class="w-full min-h-14 bg-slate-900 text-white px-4 py-4 rounded-xl font-bold text-base sm:text-lg uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Devam Et
                    </button>
                  </div>
                </div>
              }

              <!-- STEP 2: PERSONAL INFO & PAYMENT -->
              @if (currentStep() === 2) {
                <div
                  class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in"
                >
                  <div
                    class="bg-slate-900 text-white p-4 sm:p-6 flex justify-between items-center gap-3"
                  >
                    <h2 class="text-xl sm:text-2xl font-bold font-serif leading-tight">
                      2. Ödeme ve Onay
                    </h2>
                    <span class="text-blue-500 text-xs sm:text-base font-bold shrink-0">Adım 2/3</span>
                  </div>

                  <div class="p-4 sm:p-8">
                    <h3 class="text-xl font-bold text-slate-900 mb-6">
                      Kişisel Bilgiler
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                      <div class="space-y-2">
                        <label
                          for="name"
                          class="text-xs font-bold text-slate-500 uppercase"
                          >Adınız <span class="text-red-500">*</span></label
                        >
                        <input
                          id="name"
                          type="text"
                          [(ngModel)]="formName"
                          class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Örn: Ahmet"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          for="surname"
                          class="text-xs font-bold text-slate-500 uppercase"
                          >Soyadınız <span class="text-red-500">*</span></label
                        >
                        <input
                          id="surname"
                          type="text"
                          [(ngModel)]="formSurname"
                          class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Örn: Yılmaz"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          for="phone"
                          class="text-xs font-bold text-slate-500 uppercase"
                          >Telefon Numarası
                          <span class="text-red-500">*</span></label
                        >
                        <input
                          id="phone"
                          type="tel"
                          [(ngModel)]="formPhone"
                          class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Örn: 0532 123 45 67"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          for="email"
                          class="text-xs font-bold text-slate-500 uppercase"
                          >E-Posta Adresi
                          <span class="text-red-500">*</span></label
                        >
                        <input
                          id="email"
                          type="email"
                          [(ngModel)]="formEmail"
                          class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Örn: ahmet@ornek.com"
                        />
                      </div>
                    </div>

                    <h3 class="text-xl font-bold text-slate-900 mb-6">
                      Ödeme Yöntemi
                    </h3>
                    <div
                      class="flex flex-col md:flex-row gap-4 mb-8"
                      role="radiogroup"
                      aria-label="Ödeme Yöntemi Seçimi"
                    >
                      <button
                        (click)="paymentMethod.set('CREDIT_CARD')"
                        role="radio"
                        [attr.aria-checked]="paymentMethod() === 'CREDIT_CARD'"
                        [class]="
                          paymentMethod() === 'CREDIT_CARD'
                            ? 'bg-slate-900 text-white shadow-xl scale-105'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        "
                        class="flex-1 p-6 rounded-xl transition-all flex flex-col items-center justify-center group"
                      >
                        <svg
                          class="w-8 h-8 mb-3"
                          [class]="
                            paymentMethod() === 'CREDIT_CARD'
                              ? 'text-blue-500'
                              : 'text-slate-400'
                          "
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        <span class="font-bold text-sm uppercase tracking-wider"
                          >Kredi Kartı</span
                        >
                      </button>

                      <button
                        (click)="paymentMethod.set('OFFICE')"
                        role="radio"
                        [attr.aria-checked]="paymentMethod() === 'OFFICE'"
                        [class]="
                          paymentMethod() === 'OFFICE'
                            ? 'bg-slate-900 text-white shadow-xl scale-105'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        "
                        class="flex-1 p-6 rounded-xl transition-all flex flex-col items-center justify-center"
                      >
                        <svg
                          class="w-8 h-8 mb-3"
                          [class]="
                            paymentMethod() === 'OFFICE'
                              ? 'text-blue-500'
                              : 'text-slate-400'
                          "
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span class="font-bold text-sm uppercase tracking-wider"
                          >Ofiste Öde</span
                        >
                      </button>

                      <button
                        (click)="paymentMethod.set('EFT')"
                        role="radio"
                        [attr.aria-checked]="paymentMethod() === 'EFT'"
                        [class]="
                          paymentMethod() === 'EFT'
                            ? 'bg-slate-900 text-white shadow-xl scale-105'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        "
                        class="flex-1 p-6 rounded-xl transition-all flex flex-col items-center justify-center"
                      >
                        <svg
                          class="w-8 h-8 mb-3"
                          [class]="
                            paymentMethod() === 'EFT'
                              ? 'text-blue-500'
                              : 'text-slate-400'
                          "
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                          />
                        </svg>
                        <span class="font-bold text-sm uppercase tracking-wider"
                          >Havale / EFT</span
                        >
                      </button>
                    </div>

                    <!-- CREDIT CARD FORM -->
                    @if (paymentMethod() === "CREDIT_CARD") {
                      <div
                        class="bg-slate-50 p-8 rounded-2xl border border-slate-200 animate-fade-in relative overflow-hidden mb-8"
                      >
                        <div
                          class="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
                        >
                          256-Bit SSL Güvenli Ödeme
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div class="md:col-span-2">
                            <label
                              for="cc-name"
                              class="text-xs font-bold text-slate-500 uppercase block mb-2"
                              >Kart Üzerindeki İsim Soyisim</label
                            >
                            <input
                              id="cc-name"
                              type="text"
                              aria-label="Kart Üzerindeki İsim Soyisim"
                              class="w-full bg-white border border-slate-300 p-4 rounded-lg font-bold uppercase placeholder-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="AD SOYAD"
                            />
                          </div>
                          <div class="md:col-span-2">
                            <label
                              for="cc-number"
                              class="text-xs font-bold text-slate-500 uppercase block mb-2"
                              >Kart Numarası</label
                            >
                            <div class="relative">
                              <input
                                id="cc-number"
                                type="text"
                                aria-label="Kart Numarası"
                                class="w-full bg-white border border-slate-300 p-4 rounded-lg font-mono font-bold text-lg placeholder-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0000 0000 0000 0000"
                                maxlength="19"
                              />
                              <svg
                                class="w-8 h-8 absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <label
                              for="cc-exp-month"
                              class="text-xs font-bold text-slate-500 uppercase block mb-2"
                              >Son Kullanma Tarihi</label
                            >
                            <div class="flex gap-2">
                              <select
                                id="cc-exp-month"
                                aria-label="Ay"
                                class="flex-1 bg-white border border-slate-300 p-4 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option>Ay</option>
                                <option>01</option>
                                <option>02</option>
                                <option>03</option>
                                <option>04</option>
                                <option>05</option>
                                <option>06</option>
                                <option>07</option>
                                <option>08</option>
                                <option>09</option>
                                <option>10</option>
                                <option>11</option>
                                <option>12</option>
                              </select>
                              <select
                                aria-label="Yıl"
                                class="flex-1 bg-white border border-slate-300 p-4 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option>Yıl</option>
                                <option>2024</option>
                                <option>2025</option>
                                <option>2026</option>
                                <option>2027</option>
                                <option>2028</option>
                                <option>2029</option>
                                <option>2030</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label
                              for="cc-cvv"
                              class="text-xs font-bold text-slate-500 uppercase block mb-2"
                              >CVV Güvenlik Kodu</label
                            >
                            <input
                              id="cc-cvv"
                              type="text"
                              aria-label="CVV"
                              class="w-full bg-white border border-slate-300 p-4 rounded-lg font-mono font-bold placeholder-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="123"
                              maxlength="3"
                            />
                          </div>
                        </div>
                      </div>
                    }

                    <!-- OFFICE PAYMENT -->
                    @if (paymentMethod() === "OFFICE") {
                      <div
                        class="bg-blue-50 border border-blue-200 p-8 rounded-2xl text-center animate-fade-in mb-8"
                      >
                        <p class="font-bold text-blue-900 text-lg mb-2">
                          Ofiste Ödeme Seçildi
                        </p>
                        <p class="text-blue-700 text-sm">
                          Rezervasyonunuz oluşturulacak. Araç tesliminde nakit
                          veya kredi kartı ile ödeme yapabilirsiniz.
                        </p>
                      </div>
                    }

                    <!-- EFT PAYMENT -->
                    @if (paymentMethod() === "EFT") {
                      <div
                        class="bg-blue-50 border border-blue-200 p-8 rounded-2xl animate-fade-in mb-8"
                      >
                        <div
                          class="flex flex-col md:flex-row justify-between items-center gap-4"
                        >
                          <div class="text-left">
                            <p class="font-bold text-blue-900 text-lg">
                              Ziraat Bankası
                            </p>
                            <p
                              class="font-mono text-slate-700 font-bold text-xl tracking-wider my-2"
                            >
                              TR12 0001 0002 0003 0004 0005 67
                            </p>
                            <p class="text-sm text-slate-600 uppercase">
                              ALICI: ALPERLER AUTO
                            </p>
                          </div>
                          <div
                            class="bg-white p-4 rounded-lg border border-blue-100 text-xs text-slate-500 max-w-xs"
                          >
                            <p>
                              <strong>Önemli:</strong> Lütfen açıklama kısmına
                              <strong>AD SOYAD</strong> yazınız. İşlem sonrası
                              dekontu WhatsApp hattımıza iletiniz.
                            </p>
                          </div>
                        </div>
                      </div>
                    }

                    <div class="flex gap-4">
                      <button
                        (click)="currentStep.set(1)"
                        class="w-1/3 bg-slate-100 text-slate-600 py-5 rounded-xl font-bold text-lg uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Geri
                      </button>
                      <button
                        (click)="processBooking()"
                        [disabled]="!isValidForm() || isSubmitting()"
                        class="w-2/3 bg-slate-900 text-white py-5 rounded-xl font-bold text-lg uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        @if (isSubmitting()) {
                          <svg
                            class="animate-spin -ml-1 mr-3 h-6 w-6 text-current"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"
                            ></circle>
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          İşleniyor...
                        } @else {
                          {{
                            paymentMethod() === "CREDIT_CARD"
                              ? "Ödemeyi Tamamla (" +
                                (totalPrice() | number) +
                                " ₺)"
                              : "Rezervasyonu Onayla"
                          }}
                        }
                      </button>
                    </div>
                    <p class="text-center text-xs text-slate-400 mt-4">
                      "Tamamla" butonuna basarak
                      <button
                        (click)="openTerms()"
                        class="underline cursor-pointer hover:text-slate-600 font-bold"
                      >
                        Mesafeli Satış Sözleşmesi</button
                      >'ni kabul etmiş olursunuz.
                    </p>
                  </div>
                </div>
              }

              <!-- STEP 3: SUCCESS & RECEIPT -->
              @if (currentStep() === 3) {
                <div
                  class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in"
                >
                  <div class="bg-green-500 text-white p-8 text-center">
                    <div
                      class="w-20 h-20 bg-white text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                      <svg
                        class="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h2 class="text-3xl font-bold font-serif mb-2">
                      İşlem Başarılı!
                    </h2>
                    <p class="text-green-100 text-lg">
                      Rezervasyonunuz onaylandı ve sisteme kaydedildi.
                    </p>
                  </div>

                  <div class="p-4 sm:p-8">
                    <!-- Receipt / Dekont -->
                    <div
                      class="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 relative"
                    >
                      <div class="absolute top-4 right-4 text-slate-300">
                        <svg
                          class="w-12 h-12"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 14H8v-4h8v4zm4-4h-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4z"
                          />
                        </svg>
                      </div>
                      <h3
                        class="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2"
                      >
                        Rezervasyon Dekontu
                      </h3>

                      <div class="space-y-3 text-sm">
                        <div class="flex justify-between">
                          <span class="text-slate-500">Rezervasyon Kodu:</span>
                          <span class="font-bold text-slate-900"
                            >ALP-{{ bookingCode() }}</span
                          >
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-500">Müşteri:</span>
                          <span class="font-bold text-slate-900"
                            >{{ formName }} {{ formSurname }}</span
                          >
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-500">Araç:</span>
                          <span class="font-bold text-slate-900">{{
                            bookingData()?.itemName
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-500">Tarih:</span>
                          <span class="font-bold text-slate-900"
                            >{{ startDate }} - {{ endDate }}</span
                          >
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-500">Ödeme Yöntemi:</span>
                          <span class="font-bold text-slate-900">
                            {{
                              paymentMethod() === "CREDIT_CARD"
                                ? "Kredi Kartı (Ödendi)"
                                : paymentMethod() === "EFT"
                                  ? "Havale/EFT (Bekliyor)"
                                  : "Ofiste Ödeme"
                            }}
                          </span>
                        </div>
                        <div
                          class="flex justify-between pt-3 border-t border-slate-200 mt-3"
                        >
                          <span class="text-slate-900 font-bold"
                            >Toplam Tutar:</span
                          >
                          <span class="font-bold text-blue-600 text-lg"
                            >{{ totalPrice() | number }} ₺</span
                          >
                        </div>
                      </div>
                    </div>

                    <p class="text-center text-slate-600 mb-8">
                      {{ successMessage() }}
                    </p>

                    <button
                      (click)="resetFormAndGoHome()"
                      class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl"
                    >
                      Geri Dön
                    </button>
                  </div>
                </div>
              }
            }

            <!-- NON-RENTAL INQUIRY (Tour, Sale) -->
            @else {
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <!-- LEFT: SUMMARY -->
                <div class="lg:col-span-4 order-2 lg:order-1">
                  <div
                    class="bg-slate-50 rounded-2xl p-6 border border-slate-200 sticky top-28"
                  >
                    <h3
                      class="font-bold text-slate-900 text-lg mb-4 pb-4 border-b border-slate-200"
                    >
                      Talep Özeti
                    </h3>

                    <div
                      class="aspect-video rounded-lg overflow-hidden bg-white mb-4 border border-slate-200"
                    >
                      <img
                        [src]="bookingData()?.image"
                        class="w-full h-full object-cover"
                        alt="Talep Edilen Ürün Resmi"
                      />
                    </div>

                    <h4
                      class="text-xl font-serif font-bold text-slate-900 mb-1"
                    >
                      {{ bookingData()?.itemName }}
                    </h4>
                    <p class="text-slate-500 text-sm mb-6">
                      {{
                        bookingData()?.type === "TOUR"
                          ? "Tur Hizmeti"
                          : "Satın Alma Talebi"
                      }}
                    </p>

                    <div
                      class="border-t border-slate-200 pt-4 flex justify-between items-center"
                    >
                      <span class="font-bold text-lg text-slate-900"
                        >Tahmini Bedel</span
                      >
                      <span class="font-bold text-2xl text-slate-900"
                        >{{ bookingData()?.basePrice | number }} ₺</span
                      >
                    </div>
                  </div>
                </div>

                <!-- RIGHT: FORM -->
                <div class="lg:col-span-8 order-1 lg:order-2">
                  @if (successMessage()) {
                    <div
                      class="bg-green-50 border border-green-100 rounded-3xl p-12 text-center animate-fade-in-up"
                    >
                      <div
                        class="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-200"
                      >
                        <svg
                          class="w-12 h-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h2
                        class="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                      >
                        Talebiniz Alındı!
                      </h2>
                      <p
                        class="text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed"
                      >
                        {{ successMessage() }}
                      </p>

                      <button
                        (click)="resetFormAndGoHome()"
                        class="bg-slate-900 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl transform hover:scale-105"
                      >
                        Geri Dön
                      </button>
                    </div>
                  } @else {
                    <div class="bg-white">
                      <h2 class="text-2xl font-bold text-slate-900 mb-6">
                        Kişisel Bilgiler
                      </h2>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div class="space-y-2">
                          <label
                            for="name"
                            class="text-xs font-bold text-slate-500 uppercase"
                            >Adınız <span class="text-red-500">*</span></label
                          >
                          <input
                            id="name"
                            type="text"
                            [(ngModel)]="formName"
                            class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Örn: Ahmet"
                          />
                        </div>
                        <div class="space-y-2">
                          <label
                            for="surname"
                            class="text-xs font-bold text-slate-500 uppercase"
                            >Soyadınız
                            <span class="text-red-500">*</span></label
                          >
                          <input
                            id="surname"
                            type="text"
                            [(ngModel)]="formSurname"
                            class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Örn: Yılmaz"
                          />
                        </div>
                        <div class="space-y-2">
                          <label
                            for="phone"
                            class="text-xs font-bold text-slate-500 uppercase"
                            >Telefon Numarası
                            <span class="text-red-500">*</span></label
                          >
                          <input
                            id="phone"
                            type="tel"
                            [(ngModel)]="formPhone"
                            class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Örn: 0532 123 45 67"
                          />
                        </div>
                        <div class="space-y-2">
                          <label
                            for="email"
                            class="text-xs font-bold text-slate-500 uppercase"
                            >E-Posta Adresi
                            <span class="text-red-500">*</span></label
                          >
                          <input
                            id="email"
                            type="email"
                            [(ngModel)]="formEmail"
                            class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Örn: ahmet@ornek.com"
                          />
                        </div>
                        <div class="space-y-2 lg:col-span-2">
                          <label
                            class="text-xs font-bold text-slate-500 uppercase block mb-2"
                            >Bize İletmek İstediğiniz Not (Varsa)</label
                          >
                          <textarea
                            [(ngModel)]="reservationNotes"
                            rows="3"
                            class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Örn: Özel bir istek ya da not yazabilirsiniz."
                          ></textarea>
                        </div>
                      </div>

                      <button
                        (click)="processBooking()"
                        [disabled]="!isValidForm() || isSubmitting()"
                        class="w-full mt-8 bg-slate-900 text-white py-6 rounded-xl font-bold text-xl uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center"
                      >
                        @if (isSubmitting()) {
                          <svg
                            class="animate-spin -ml-1 mr-3 h-6 w-6 text-current"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"
                            ></circle>
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Gönderiliyor...
                        } @else {
                          Talebi Gönder
                        }
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ==========================
            STANDARD CONTACT PAGE (Non-Booking)
            ========================== -->
      @else {
        <div class="animate-fade-in">
          <div
            class="relative bg-slate-900 h-[300px] flex items-center justify-center overflow-hidden mb-[-50px]"
          >
            <div
              class="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"
            ></div>
            <div class="relative z-10 text-center">
              <h1 class="font-serif text-5xl font-bold text-white mb-4">
                İletişim
              </h1>
              <p class="text-slate-400 text-lg">7/24 Yanınızdayız</p>
            </div>
          </div>

          <div
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10"
          >
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <!-- Left Column: Info & Map -->
              <div class="space-y-8">
                <div class="bg-slate-900 text-white p-8 rounded-xl shadow-lg">
                  <h3 class="font-serif text-xl font-bold mb-6 text-blue-500">
                    İletişim Bilgileri
                  </h3>
                  <ul class="space-y-6">
                    <li class="flex items-start">
                      <svg
                        class="w-5 h-5 text-blue-500 mr-4 mt-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{{ config().address }}</span>
                    </li>
                    <li class="flex items-center">
                      <svg
                        class="w-5 h-5 text-blue-500 mr-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <a
                        [href]="'tel:' + config().phone"
                        class="text-lg font-bold hover:text-blue-500 transition-colors"
                        >{{ config().phone }}</a
                      >
                    </li>
                    <li class="flex items-center">
                      <svg
                        class="w-5 h-5 text-blue-500 mr-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <a
                        [href]="'mailto:' + config().email"
                        class="hover:text-blue-500 transition-colors"
                        >{{ config().email }}</a
                      >
                    </li>
                  </ul>
                </div>
                <div
                  class="bg-white p-2 rounded-xl shadow-lg h-[300px] overflow-hidden border border-slate-200"
                >
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50276.81582640637!2d44.26237087249756!3d37.55376989803086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40081211590d3409%3A0x972e3687221b8b2a!2zWcOca3Nla292YSwgSGFra2FyaQ!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str"
                    width="100%"
                    height="100%"
                    style="border:0;"
                    allowfullscreen=""
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
              <!-- Right Column: Contact Form -->
              <div
                class="bg-white p-8 shadow-xl rounded-xl border-t-4 border-slate-900"
              >
                <div class="flex justify-between items-start mb-2">
                  <h2 class="font-serif text-3xl font-bold text-slate-900">
                    Bize Ulaşın
                  </h2>
                  <div class="flex gap-2">
                    @if (config().instagramUrl) {
                      <a
                        [href]="config().instagramUrl"
                        target="_blank"
                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                          />
                        </svg>
                      </a>
                    }
                    @if (config().facebookUrl) {
                      <a
                        [href]="config().facebookUrl"
                        target="_blank"
                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                          />
                        </svg>
                      </a>
                    }
                    @if (config().twitterUrl) {
                      <a
                        [href]="config().twitterUrl"
                        target="_blank"
                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <svg
                          class="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                          />
                        </svg>
                      </a>
                    }
                    @if (config().youtubeUrl) {
                      <a
                        [href]="config().youtubeUrl"
                        target="_blank"
                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"
                          />
                        </svg>
                      </a>
                    }
                    @if (config().tiktokUrl) {
                      <a
                        [href]="config().tiktokUrl"
                        target="_blank"
                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
                          />
                        </svg>
                      </a>
                    }
                  </div>
                </div>
                <p class="text-slate-500 mb-8">
                  Sorularınız veya talepleriniz için formu doldurun.
                </p>
                <form (submit)="submitGeneralContact($event)" class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label for="contact-name" class="sr-only">Adınız</label>
                      <input
                        id="contact-name"
                        type="text"
                        [(ngModel)]="contactName"
                        name="contactName"
                        placeholder="Adınız"
                        required
                        class="w-full bg-slate-50 border border-slate-200 p-4 rounded-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label for="contact-surname" class="sr-only"
                        >Soyadınız</label
                      >
                      <input
                        id="contact-surname"
                        type="text"
                        [(ngModel)]="contactSurname"
                        name="contactSurname"
                        placeholder="Soyadınız"
                        required
                        class="w-full bg-slate-50 border border-slate-200 p-4 rounded-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                    <div>
                      <label for="contact-phone" class="sr-only">Telefon</label>
                      <input
                        id="contact-phone"
                        type="tel"
                        [(ngModel)]="contactPhone"
                        name="contactPhone"
                        placeholder="Telefon"
                        required
                        class="w-full bg-slate-50 border border-slate-200 p-4 rounded-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label for="contact-email" class="sr-only">E-Posta</label>
                      <input
                        id="contact-email"
                        type="email"
                        [(ngModel)]="contactEmail"
                        name="contactEmail"
                        placeholder="E-Posta"
                        required
                        class="w-full bg-slate-50 border border-slate-200 p-4 rounded-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label for="contact-message" class="sr-only"
                        >Mesajınız</label
                      >
                    <textarea
                      id="contact-message"
                      rows="4"
                      [(ngModel)]="contactMessage"
                      name="contactMessage"
                      placeholder="Mesajınız"
                      class="w-full bg-slate-50 border border-slate-200 p-4 rounded-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    [disabled]="!isValidContactForm()"
                    class="w-full py-4 bg-slate-900 text-white font-bold uppercase tracking-widest shadow-lg hover:bg-blue-500 hover:text-slate-900 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Gönder
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ContactComponent implements OnInit {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  toastService = inject(ToastService);
  location = inject(Location);
  config = this.carService.getConfig();

  bookingData = signal<BookingRequest | null>(null);
  extrasDropdownOpen = signal(false);

  goBack() {
    if (this.bookingData()) {
      if (this.currentStep() > 1 && !this.successMessage()) {
        this.currentStep.update((s) => s - 1);
      } else {
        this.clearBooking();
      }
    } else {
      if (window.history.length > 1) {
        this.location.back();
      } else {
        this.router.navigate(["/"]);
      }
    }
  }

  // Form Fields
  formName = "";
  formSurname = "";
  formPhone = "";
  formEmail = ""; // Added Email
  reservationNotes = "";

  // General Contact Form Fields
  contactName = "";
  contactSurname = "";
  contactPhone = "";
  contactEmail = "";
  contactMessage = "";

  // Rental Logic
  startDate = "";
  endDate = "";
  rentalDuration = "daily"; // Default
  selectedHours = 1;
  withDriver = false;
  // Upsell Logic
  wantsChildSeat = false;
  childSeatPriceDaily = 250;
  wantsInsurance = false;
  insurancePriceDaily = 450;
  wantsNavigation = false;
  navigationPriceDaily = 150;

  totalDays = signal(0);

  totalPrice = signal(0);
  paymentMethod = signal<"CREDIT_CARD" | "EFT" | "OFFICE">("CREDIT_CARD");

  // UI States
  isSubmitting = signal(false);
  successMessage = signal("");
  bookingCode = signal("");
  currentStep = signal<number>(1);

  openTerms() {
    this.router.navigate(["/legal"], { queryParams: { type: "terms" } });
  }

  ngOnInit() {
    const req = this.carService.getBookingRequest();
    if (req) {
      this.bookingData.set(req);
      if (req.startDate) this.startDate = req.startDate;
      if (req.endDate) this.endDate = req.endDate;
      if (req.rentalDuration) this.rentalDuration = req.rentalDuration;
      if (req.withDriver !== undefined) this.withDriver = req.withDriver;
      this.calculatePrice();
    }
  }

  calculatePrice() {
    const req = this.bookingData();
    if (!req || req.type !== "RENTAL") return;

    if (this.rentalDuration === "hourly" && this.startDate) {
      // Hourly Logic Adjustment
      const hours = Math.max(1, Math.min(23, this.selectedHours || 1));
      const baseHourlyRate = ((req.basePrice || 0) / 24) * 1.5; // Premium for hourly (1.5x)
      let price = baseHourlyRate * hours;

      // Cap at daily rate + small logic to avoid overcharging for almost a day
      if (price > (req.basePrice || 0)) {
        price = req.basePrice || 0;
      }

      const driverFee = this.withDriver ? (1500 / 24) * hours * 1.5 : 0; // Hourly driver fee
      const finalDriverFee = Math.min(driverFee, 1500); // Max 1 day of driver

      this.totalDays.set(1);
      this.totalPrice.set(Math.round(price + finalDriverFee));
      return;
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const timeDiff = end.getTime() - start.getTime();
      let days = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if (days < 1) days = 1; // Minimum 1 day/slot

      // Driver Fee
      const driverFee = this.withDriver ? 1500 : 0; // 1500 TL per day for driver

      this.totalDays.set(days);

      // Base Price Calculation
      const baseTotal = (req.basePrice || 0) * days;
      const totalDriverFee = driverFee * days;

      // Upsell
      const upsellFees = 
        (this.wantsChildSeat ? this.childSeatPriceDaily * days : 0) +
        (this.wantsInsurance ? this.insurancePriceDaily * days : 0) +
        (this.wantsNavigation ? this.navigationPriceDaily * days : 0);

      // Dynamic Pricing (Hafta sonu %15 artış, Kış %10 indirim algoritması)
      let dynamicMultiplier = 1.0;
      const startMonth = start.getMonth(); // 0 is January
      const startDayOfWeek = start.getDay(); // 0 is Sunday, 6 is Saturday
      
      // Kış indirimi (Aralık, Ocak, Şubat) -> %10 İndirim
      if (startMonth === 11 || startMonth === 0 || startMonth === 1) {
          dynamicMultiplier -= 0.10;
      }
      // Hafta sonu -> %15 Artış
      if (startDayOfWeek === 0 || startDayOfWeek === 6) {
          dynamicMultiplier += 0.15;
      }

      const calculatedBaseTotal = baseTotal * dynamicMultiplier;

      this.totalPrice.set(calculatedBaseTotal + totalDriverFee + upsellFees);
    }
  }

  clearBooking() {
    this.carService.clearBookingRequest();
    this.bookingData.set(null);
    this.resetLocalState();
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  isValidForm(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]*[0-9\s-]{10,20}$/; // Basic international/local phone
    if (!this.formName?.trim() || !this.formSurname?.trim()) return false;
    if (!this.formPhone || !phoneRegex.test(this.formPhone.trim())) return false;
    if (!this.formEmail || !emailRegex.test(this.formEmail.trim())) return false;
    return true;
  }

  processBooking() {
    if (!this.isValidForm()) return;

    this.isSubmitting.set(true);
    const req = this.bookingData()!;

    // Simulate Payment Processing Delay
    const delay =
      req.type === "RENTAL" && this.paymentMethod() === "CREDIT_CARD"
        ? 2500
        : 1500;

    setTimeout(() => {
      this.isSubmitting.set(false);

      // Generate unique booking code
      this.bookingCode.set(
        Math.floor(100000 + Math.random() * 900000).toString(),
      );

      // Construct Request
      const finalStartDate = this.startDate;
      let finalEndDate = this.endDate;

      // If hourly, block the selected date as the "end date" visually, or consider it the same day
      if (this.rentalDuration === "hourly") {
        finalEndDate = this.startDate;
      }

      const finalRequest: BookingRequest = {
        ...req,
        customerName: `${this.formName} ${this.formSurname}`,
        customerPhone: this.formPhone,
        customerEmail: this.formEmail,
        startDate: finalStartDate,
        endDate: finalEndDate,
        days: this.totalDays(),
        totalPrice: this.totalPrice() || req.basePrice,
        rentalDuration: this.rentalDuration,
        withDriver: this.withDriver,
        notes: `${this.reservationNotes}\nEkstralar: ${this.wantsChildSeat ? 'Bebek Koltuğu | ' : ''}${this.wantsInsurance ? 'Tam Kapsamlı Sigorta | ' : ''}${this.wantsNavigation ? 'Navigasyon | ' : ''}Ödeme: ${this.paymentMethod()}`,
      };

      // Save to Service
      this.carService.addReservation(finalRequest);

      // Set Success Message based on Payment
      if (req.type === "RENTAL") {
        if (this.paymentMethod() === "CREDIT_CARD") {
          this.successMessage.set(
            `Ödemeniz güvenli bir şekilde alındı. Araç teslimatı için ofisimizde bekleniyorsunuz.`,
          );
        } else if (this.paymentMethod() === "EFT") {
          this.successMessage.set(
            `Havale bildiriminiz alındı. Lütfen ödeme dekontunu 0537 959 48 51 WhatsApp hattımıza iletiniz.`,
          );
        } else {
          this.successMessage.set(
            `Rezervasyonunuz oluşturuldu. Ödemeyi ofiste araç teslimi sırasında yapabilirsiniz.`,
          );
        }
      } else {
        this.successMessage.set(
          `Talebiniz bize ulaştı. En kısa sürede ${this.formPhone} numarasından size dönüş yapılacaktır.`,
        );
      }

      this.currentStep.set(3);
    }, delay);
  }

  resetFormAndGoHome() {
    this.clearBooking();
    // clearBooking already closes the overlay
  }

  async submitGeneralContact(e: Event) {
    e.preventDefault();
    if (!this.isValidContactForm()) return;

    const messageText = `[İLETİŞİM FORMU]
      Ad Soyad: ${this.contactName} ${this.contactSurname}
      Telefon: ${this.contactPhone}
      E-posta: ${this.contactEmail}
      Mesaj: ${this.contactMessage}`;

    this.carService.sendNotification("alperlerauto@gmail.com", messageText, undefined, "Yeni İletişim Mesajı");
    
    if (this.contactEmail && this.contactEmail.includes("@")) {
      const customerMsg = `Sayın ${this.contactName},\n\nMesajınız tarafımıza başarıyla ulaşmıştır. Uzman ekibimiz en kısa sürede sizinle iletişime geçecektir.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n\nAlperler Auto`;
      this.carService.sendNotification(this.contactEmail, customerMsg, undefined, "Mesajınız Alındı - Alperler Auto");
    }

    // YENİ: İletişim formu için webhook tetiklemesi
    this.carService.triggerWebhook('new_contact_message', {
      name: `${this.contactName} ${this.contactSurname}`,
      phone: this.contactPhone,
      email: this.contactEmail,
      message: this.contactMessage
    });

    try {
      const path = "messages";
      const msgId = `MSG-${Date.now()}`;
      await setDoc(doc(db, path, msgId), {
        name: `${this.contactName} ${this.contactSurname}`,
        email: this.contactEmail,
        message: this.contactMessage,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, "messages");
      } catch (e) {
        console.error(e);
      }
    }

    this.toastService.show("Mesajınız iletildi! Teşekkürler.", "success");

    // Reset Form
    this.contactName = "";
    this.contactSurname = "";
    this.contactPhone = "";
    this.contactEmail = "";
    this.contactMessage = "";
  }

  isValidContactForm(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]*[0-9\s-]{10,20}$/; 
    if (!this.contactName?.trim() || !this.contactSurname?.trim() || !this.contactMessage?.trim()) return false;
    if (!this.contactPhone || !phoneRegex.test(this.contactPhone.trim())) return false;
    if (!this.contactEmail || !emailRegex.test(this.contactEmail.trim())) return false;
    return true;
  }

  private resetLocalState() {
    this.formName = "";
    this.formSurname = "";
    this.formPhone = "";
    this.formEmail = "";
    this.successMessage.set("");
    this.bookingCode.set("");
    this.startDate = "";
    this.endDate = "";
  }
}

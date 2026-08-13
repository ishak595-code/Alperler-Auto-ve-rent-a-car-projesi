import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TurkishCurrencyPipe } from '../../pipes/turkish-currency.pipe';

@Component({
  selector: 'app-admin-cars',
  standalone: true,
  imports: [CommonModule, FormsModule, TurkishCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showForm()) {
       <div class="w-full min-h-screen bg-white animate-fade-in flex flex-col">
          <div class="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-30 shadow-sm">
              <div class="flex items-center gap-4">
                 <button (click)="closeForm()" aria-label="Geri Dön" class="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 p-2 md:px-5 md:py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    <span class="hidden md:inline">İptal Edip Geri Dön</span>
                 </button>
                 <h4 class="font-bold text-xl md:text-2xl text-slate-900 tracking-tight">{{ isEditing ? 'Aracı Düzenle' : 'Yeni Araç Ekle' }} <span class="text-blue-600 font-medium text-base md:text-lg ml-2">({{ formType() === 'RENTAL' ? 'Kiralık Araç' : 'Satılık Araç' }})</span></h4>
              </div>
              
              <!-- Wizard Progress -->
              <div class="flex items-center justify-between relative mt-2 md:mt-0 max-w-[200px] w-full">
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 transition-all duration-300" [style.width]="((currentStep() - 1) / 5) * 100 + '%'"></div>
                  
                  @for (step of [1, 2, 3, 4, 5, 6]; track step) {
                      <div class="flex flex-col items-center gap-2 bg-white px-1">
                          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-colors"
                               [class.bg-blue-500]="currentStep() >= step"
                               [class.text-white]="currentStep() >= step"
                               [class.bg-slate-100]="currentStep() < step"
                               [class.text-slate-400]="currentStep() < step">
                              {{ step }}
                          </div>
                      </div>
                  }
              </div>
          </div>
          
          <div class="p-4 md:p-8 space-y-6 flex-1 max-w-5xl w-full mx-auto">
                    <!-- Step 1: Temel Bilgiler -->
                    @if (currentStep() === 1) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 1: Temel Bilgiler</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div class="md:col-span-2">
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">İlan Başlığı (Zorunlu)</label>
                                  <input [(ngModel)]="currentCar.title" aria-label="İlan Başlığı" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: {{ formType() === 'RENTAL' ? 'Kiralık Araç' : 'Sahibinden Temiz Aile Aracı' }}">
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Marka</label>
                                  <input [(ngModel)]="currentCar.brand" aria-label="Marka" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Seri</label>
                                  <input [(ngModel)]="currentCar.series" aria-label="Seri" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 3 Serisi, Passat">
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Model / Donanım Paketi</label>
                                  <input [(ngModel)]="currentCar.model" aria-label="Model Donanım Paketi" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 1.6 TDi Impression">
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Model Yılı</label>
                                  <input [(ngModel)]="currentCar.year" aria-label="Model Yılı" type="number" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                               </div>
                               @if(formType() === 'SALES') {
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Kilometre (KM)</label>
                                     <input [(ngModel)]="currentCar.km" aria-label="Kilometre" type="number" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                  </div>
                               } @else {
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Koltuk Sayısı</label>
                                     <input [(ngModel)]="currentCar.seats" aria-label="Koltuk Sayısı" type="number" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Araç Sınıfı</label>
                                     <select [(ngModel)]="currentCar.group" aria-label="Araç Sınıfı Seçimi" class="w-full p-3 border rounded-lg bg-slate-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Ekonomik">Ekonomik</option>
                                        <option value="Konfor">Konfor</option>
                                        <option value="Premium">Premium</option>
                                        <option value="SUV">SUV</option>
                                     </select>
                                  </div>
                               }
                               <div class="md:col-span-2">
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Fiyat (TL) {{ formType() === 'RENTAL' ? '(Günlük)' : '' }}</label>
                                  <input [(ngModel)]="currentCar.price" aria-label="Fiyat Bilgisi" type="number" class="w-full p-3 border rounded-lg bg-slate-50 font-bold text-green-600 focus:ring-2 focus:ring-blue-500 outline-none">
                               </div>

                               <div class="md:col-span-2 mt-4 space-y-4 border-t pt-4">
                                  <h6 class="font-bold text-sm text-slate-700">Rozet & Kampanyalar</h6>
                                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Özel Etiket (Rozet)</label>
                                        <select [(ngModel)]="currentCar.badge" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                           <option value="">Yok (Boş)</option>
                                           <option value="KAMPANYA">KAMPANYA</option>
                                           <option value="FIRSAT">FIRSAT</option>
                                           <option value="YENİ">YENİ</option>
                                           <option value="ACİL">ACİL</option>
                                           <option value="POPÜLER">POPÜLER</option>
                                           <option value="PREMIUM">PREMIUM</option>
                                           <option value="KAMPANYA">KAMPANYA</option>
                                        </select>
                                     </div>
                                     <div class="flex items-center gap-2 mt-2 md:mt-6">
                                         <input type="checkbox" id="isFeat" [(ngModel)]="currentCar.isFeatured" class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                                         <label for="isFeat" class="text-sm font-bold text-slate-700">Ana Sayfada Öne Çıkar (Vitrin/Featured)</label>
                                     </div>
                                     <div class="flex items-center gap-2 mt-2">
                                         <input type="checkbox" id="isCamp" [(ngModel)]="currentCar.isCampaign" class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                                         <label for="isCamp" class="text-sm font-bold text-slate-700">Kampanyalı Araç (Campaigns)</label>
                                     </div>
                                     <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">İndirim Oranı / Eski Fiyat</label>
                                        <input [(ngModel)]="currentCar.discountRate" type="number" class="w-full p-3 border rounded-lg bg-slate-50 outline-none" placeholder="Örn: 10 (Yüzde 10 indirim vb. için)">
                                     </div>
                                  </div>
                               </div>
                            </div>
                        </div>
                    }

                    <!-- Step 2: Teknik Özellikler -->
                    @if (currentStep() === 2) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 2: Teknik Özellikler</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Kasa Tipi</label>
                                  <select [(ngModel)]="currentCar.type" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                     <option value="SUV">SUV</option>
                                     <option value="Sedan">Sedan</option>
                                     <option value="Minibüs">Minibüs</option>
                                     <option value="Pickup">Pickup</option>
                                     <option value="Hatchback">Hatchback</option>
                                     <option value="Luxury">Luxury</option>
                                  </select>
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Yakıt</label>
                                  <select [(ngModel)]="currentCar.fuel" class="w-full p-3 border rounded-lg bg-slate-50">
                                     <option value="Dizel">Dizel</option>
                                     <option value="Benzin">Benzin</option>
                                     <option value="Hibrit">Hibrit</option>
                                     <option value="Elektrik">Elektrik</option>
                                  </select>
                               </div>
                               <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Vites</label>
                                  <select [(ngModel)]="currentCar.transmission" class="w-full p-3 border rounded-lg bg-slate-50">
                                     <option value="Otomatik">Otomatik</option>
                                     <option value="Manuel">Manuel</option>
                                  </select>
                               </div>
                               @if(formType() === 'SALES') {
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Çekiş</label>
                                     <input [(ngModel)]="currentCar.drivetrain" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 4x4, Önden Çekiş">
                                  </div>
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Motor Hacmi (cc)</label>
                                     <input [(ngModel)]="currentCar.engineVolume" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 1.6">
                                  </div>
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Motor Gücü (HP)</label>
                                     <input [(ngModel)]="currentCar.enginePower" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 110 HP">
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Renk</label>
                                     <input [(ngModel)]="currentCar.color" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: Siyah, Beyaz">
                                  </div>
                               } @else {
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Bagaj Kapasitesi</label>
                                     <input [(ngModel)]="currentCar.luggage" type="number" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 3">
                                  </div>
                               }
                            </div>
                        </div>
                    }

                    <!-- Step 3: Detaylı Donanım -->
                    @if (currentStep() === 3) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 3: Detaylı Donanım</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">İç Donanım</label>
                                    <textarea [ngModel]="currentCar.detailedFeatures?.interior?.join(', ')" (ngModelChange)="updateDetailedFeatures('interior', $event)" rows="3" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Deri Koltuk, Klima..."></textarea>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dış Donanım</label>
                                    <textarea [ngModel]="currentCar.detailedFeatures?.exterior?.join(', ')" (ngModelChange)="updateDetailedFeatures('exterior', $event)" rows="3" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Alaşımlı Jant, Sunroof..."></textarea>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Multimedya</label>
                                    <textarea [ngModel]="currentCar.detailedFeatures?.multimedia?.join(', ')" (ngModelChange)="updateDetailedFeatures('multimedia', $event)" rows="3" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Bluetooth, Navigasyon..."></textarea>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Güvenlik</label>
                                    <textarea [ngModel]="currentCar.detailedFeatures?.safety?.join(', ')" (ngModelChange)="updateDetailedFeatures('safety', $event)" rows="3" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ABS, ESP, Hava Yastığı..."></textarea>
                                </div>
                                <div class="md:col-span-2">
                                   <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Öne Çıkan Özellikler (Virgülle ayırın)</label>
                                   <textarea [ngModel]="currentCar.features?.join(', ')" (ngModelChange)="currentCar.features = $event.split(',').map(s => s.trim()).filter(s => s)" rows="2" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: Sunroof, Deri Koltuk, Geri Görüş Kamerası"></textarea>
                                </div>
                            </div>
                        </div>
                    }

                    <!-- Step 4: Ekspertiz ve Durum -->
                    @if (currentStep() === 4) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 4: {{ formType() === 'RENTAL' ? 'Kiralama Şartları' : 'Ekspertiz ve Durum' }}</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                @if(formType() === 'SALES') {
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Ağır Hasar Kayıtlı Mı?</label>
                                     <select [(ngModel)]="currentCar.isDamageFree" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option [ngValue]="true">Hayır (Ağır Hasar Kaydı Yok)</option>
                                        <option [ngValue]="false">Evet (Ağır Hasar Kayıtlı)</option>
                                     </select>
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tramer Bilgisi</label>
                                     <input [(ngModel)]="currentCar.tramer" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 5000 TL tremer kaydı bulunmaktadır.">
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Garanti Durumu</label>
                                     <input [(ngModel)]="currentCar.warranty" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: Garantili, Garantisiz">
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Boya / Değişen Durumu</label>
                                     <input [(ngModel)]="currentCar.damageStatus" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: Hatasız, 2 Parça Boyalı">
                                  </div>
                                  <div class="md:col-span-2">
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Ekspertiz Raporu Linki (PDF vb. - Boş bırakılabilir)</label>
                                     <input [(ngModel)]="currentCar.expertReport" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://...">
                                  </div>
                               } @else {
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Şoför Seçeneği</label>
                                     <select [(ngModel)]="currentCar.driverOption" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option [ngValue]="undefined">Belirtilmedi</option>
                                        <option value="WITHOUT_DRIVER">Şoförsüz</option>
                                        <option value="WITH_DRIVER">Şoförlü</option>
                                        <option value="BOTH">Şoförlü ve Şoförsüz (İkisi de)</option>
                                     </select>
                                  </div>
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Ehliyet Yılı</label>
                                     <input [(ngModel)]="currentCar.minLicenseYears" type="number" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 2">
                                  </div>
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Depozito (TL)</label>
                                     <input [(ngModel)]="currentCar.deposit" type="number" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 5000">
                                  </div>
                                  <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Günlük KM Limiti</label>
                                     <input [(ngModel)]="currentCar.dailyMileageLimit" type="number" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: 300">
                                  </div>
                               }
                               <div class="md:col-span-2">
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Araç Durumu</label>
                                  <select [(ngModel)]="currentCar.isAvailable" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                     <option [ngValue]="true">{{ formType() === 'RENTAL' ? 'Müsait (Kiralanabilir)' : 'Satışta' }}</option>
                                     <option [ngValue]="false">{{ formType() === 'RENTAL' ? 'Dolu / Bakımda' : 'Satıldı' }}</option>
                                  </select>
                               </div>
                               <div class="md:col-span-2">
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dolu (Rezerve) Tarihler</label>
                                  <div class="flex gap-2 mb-2">
                                    <input type="date" #newDateStart class="p-2 border rounded-lg bg-white text-sm">
                                    <input type="date" #newDateEnd class="p-2 border rounded-lg bg-white text-sm">
                                    <button type="button" (click)="addBookedDate(newDateStart, newDateEnd)" class="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold">Ekle</button>
                                  </div>
                                  <div class="space-y-1">
                                    @for(d of currentCar.bookedDates; track d; let i = $index) {
                                      <div class="flex items-center justify-between p-2 bg-white border rounded text-xs">
                                        <span>{{ d.start }} - {{ d.end }}</span>
                                        <button type="button" (click)="removeBookedDate(i)" class="text-red-500 font-bold hover:text-red-700">Sil</button>
                                      </div>
                                    }
                                  </div>
                               </div>
                               
                               <div class="md:col-span-2">
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Genel Açıklama</label>
                                  <textarea [(ngModel)]="currentCar.description" rows="4" class="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Araç hakkında genel bilgiler..."></textarea>
                               </div>
                            </div>
                        </div>
                    }

                    <!-- Step 5: Fotoğraflar -->
                    @if (currentStep() === 5) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 5: Fotoğraflar</h5>
                            <div class="space-y-4">
                                <label class="block text-sm font-bold text-slate-700 uppercase">Araç Fotoğrafları (Max 30)</label>
                                
                                <!-- Main Image Preview -->
                                @if (currentCar.images && currentCar.images.length > 0) {
                                    <div class="relative group rounded-xl overflow-hidden shadow-lg aspect-video bg-slate-100">
                                        <img [src]="currentCar.images[activeImageIndex]" class="w-full h-full object-contain">
                                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button (click)="removeImage(activeImageIndex)" class="bg-red-500 text-white p-2 rounded-full hover:bg-red-600">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                        <div class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                            {{ activeImageIndex + 1 }} / {{ currentCar.images.length }}
                                        </div>
                                    </div>
                                    
                                    <!-- Thumbnails -->
                                    <div class="flex gap-2 overflow-x-auto pb-2">
                                        @for (img of currentCar.images; track $index) {
                                            <button (click)="activeImageIndex = $index" [class.ring-2]="activeImageIndex === $index" class="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 ring-blue-500">
                                                <img [src]="img" class="w-full h-full object-cover">
                                            </button>
                                        }
                                        
                                        <!-- Add More Button -->
                                        @if (currentCar.images.length < 30) {
                                            <div class="relative w-20 h-14 flex-shrink-0 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
                                                <span class="text-2xl text-slate-400">+</span>
                                                <input type="file" (change)="onFileSelected($event)" accept="image/*" multiple class="absolute inset-0 opacity-0 cursor-pointer">
                                            </div>
                                        }
                                    </div>
                                } @else {
                                    <div class="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-12 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                                        <svg class="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                        <p class="mt-1 text-sm text-slate-600 font-bold">Fotoğrafları Seç veya Sürükle</p>
                                        <p class="text-xs text-slate-500">PNG, JPG, GIF (Max 5MB)</p>
                                        <input type="file" (change)="onFileSelected($event)" accept="image/*" multiple class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                    </div>
                                }
                            </div>
                        </div>
                    }

                    <!-- Step 6: Önizleme ve Onay -->
                    @if (currentStep() === 6) {
                        <div class="space-y-4 animate-fade-in">
                            <h5 class="font-bold text-lg text-slate-800 border-b pb-2">Adım 6: Önizleme ve Onay</h5>
                            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h6 class="font-bold text-slate-900 mb-2">{{ currentCar.title || 'Başlıksız İlan' }}</h6>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    <div><span class="text-slate-500">Marka:</span> <span class="font-bold">{{ currentCar.brand }}</span></div>
                                    <div><span class="text-slate-500">Model:</span> <span class="font-bold">{{ currentCar.model }}</span></div>
                                    <div><span class="text-slate-500">Yıl:</span> <span class="font-bold">{{ currentCar.year }}</span></div>
                                    <div><span class="text-slate-500">Fiyat:</span> <span class="font-bold text-green-600">{{ currentCar.price | number }} TL</span></div>
                                </div>
                                <div class="mt-4">
                                    <span class="text-slate-500 text-sm">Fotoğraf Sayısı:</span> <span class="font-bold">{{ currentCar.images?.length || 0 }}</span>
                                </div>
                            </div>
                            <p class="text-sm text-slate-600">Tüm bilgilerin doğruluğunu kontrol ettikten sonra ilanı kaydedebilirsiniz.</p>
                        </div>
                    }
                 </div>
                 
                 <div class="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl sticky bottom-0">
                    <button (click)="closeForm()" class="px-6 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">İptal</button>
                    <div class="flex gap-3">
                        @if (currentStep() > 1) {
                            <button (click)="currentStep.set(currentStep() - 1)" class="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all">
                                Geri
                            </button>
                        }
                        @if (currentStep() < 6) {
                            <button (click)="currentStep.set(currentStep() + 1)" class="px-6 py-2 bg-blue-500 text-slate-900 font-bold rounded-lg shadow-md hover:bg-blue-600 transition-all">
                                İleri
                            </button>
                        } @else {
                            <button (click)="saveCar()" class="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                                <mat-icon class="text-sm">save</mat-icon>
                                {{ isEditing ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla' }}
                            </button>
                        }
                    </div>
                 </div>
              </div>
        } @else {
 
     <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex justify-between items-center animate-fade-in">
         <div class="flex items-center gap-4">
             <button (click)="router.navigate(['/admin/dashboard'])" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
             </button>
             <h1 class="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Araç Yönetimi</h1>
         </div>
         
         <div class="relative">
             <button (click)="isPageMenuOpen.set(!isPageMenuOpen())" aria-label="Sayfa Menüsü" class="p-3 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors focus:outline-none flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
             </button>
             
             @if(isPageMenuOpen()) {
                 <div class="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                     <div class="px-4 py-3 bg-slate-800 border-b border-slate-700 font-bold text-xs text-slate-400 uppercase tracking-widest">Görünüm</div>
                     <button (click)="activeTab.set('RENTAL'); isPageMenuOpen.set(false)" [class.bg-blue-600]="activeTab() === 'RENTAL'" [class.text-white]="activeTab() === 'RENTAL'" [class.text-slate-300]="activeTab() !== 'RENTAL'" class="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-800 transition-colors border-b border-slate-700 flex items-center justify-between">
                         Kiralık Filo
                         @if(activeTab() === 'RENTAL') { <svg class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> }
                     </button>
                     <button (click)="activeTab.set('SALES'); isPageMenuOpen.set(false)" [class.bg-blue-600]="activeTab() === 'SALES'" [class.text-white]="activeTab() === 'SALES'" [class.text-slate-300]="activeTab() !== 'SALES'" class="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-800 transition-colors border-b border-slate-700 flex items-center justify-between">
                         Galeri (Satılık)
                         @if(activeTab() === 'SALES') { <svg class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> }
                     </button>
                     <div class="px-4 py-3 bg-slate-800 border-b border-slate-700 font-bold text-xs text-slate-400 uppercase tracking-widest mt-1">İşlemler</div>
                     <button (click)="openForm(); isPageMenuOpen.set(false)" class="w-full text-left px-4 py-3 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-2">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                         Yeni Araç Ekle
                     </button>
                 </div>
             }
         </div>
         @if(isPageMenuOpen()) {
             <div class="fixed inset-0 z-40 bg-transparent" (click)="isPageMenuOpen.set(false)"></div>
         }
     </div>
     
     <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in relative z-20">
        <div class="p-5 bg-slate-50 border-b border-slate-200">
           <h3 class="font-bold text-xl text-slate-800">{{ activeTab() === 'RENTAL' ? 'Kiralık Araç Listesi (' + cars().length + ')' : 'Satılık Araç Listesi (' + saleCars().length + ')' }}</h3>
           <p class="text-sm text-slate-500 mt-1">Sistemdeki araçları görüntüleyebilir ve yönetebilirsiniz.</p>
        </div>

        <div class="overflow-x-auto">
           <table class="w-full text-left whitespace-nowrap">
              <thead class="bg-slate-100 text-slate-500 text-xs uppercase">
                 <tr>
                    <th class="px-6 py-3">Resim</th>
                    <th class="px-6 py-3">İlan Başlığı</th>
                    <th class="px-6 py-3">Marka/Model</th>
                    <th class="px-6 py-3">Detay</th>
                    <th class="px-6 py-3">Fiyat</th>
                    <th class="px-6 py-3">Durum</th>
                    <th class="px-6 py-3 text-right">İşlemler</th>
                 </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                 @if (activeTab() === 'RENTAL') {
                     @for (car of cars(); track car.id) {
                        <tr class="hover:bg-slate-50 transition-colors group">
                           <td class="px-6 py-3">
                              <img [src]="car.image || (car.images && car.images[0])" class="w-16 h-12 object-cover rounded shadow-sm border border-slate-200">
                           </td>
                           <td class="px-6 py-3 text-sm text-slate-700 max-w-[200px] truncate" [title]="car.title || '-'">{{ car.title || '-' }}</td>
                           <td class="px-6 py-3 font-bold text-slate-900">{{ car.brand }} {{ car.model }}</td>
                           <td class="px-6 py-3 text-sm text-slate-500">
                              <span class="bg-slate-100 px-2 py-1 rounded border">{{ car.type }}</span>
                           </td>
                           <td class="px-6 py-3 font-bold text-slate-900">{{ car.price | turkishCurrency }}</td>
                           <td class="px-6 py-3">
                              <span [class]="car.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="px-2 py-1 rounded text-xs font-bold inline-flex items-center">
                                 <span class="w-2 h-2 rounded-full mr-2" [class]="car.isAvailable ? 'bg-green-500' : 'bg-red-500'"></span>
                                 {{ car.isAvailable ? 'Müsait' : 'Dolu' }}
                              </span>
                           </td>
                           <td class="px-6 py-3 text-right space-x-2">
                              <button (click)="editCar(car)" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                 Düzenle
                              </button>
                              <button (click)="deleteCar(car.id)" class="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                 Sil
                              </button>
                           </td>
                        </tr>
                     }
                 } @else {
                     @for (car of saleCars(); track car.id) {
                        <tr class="hover:bg-slate-50 transition-colors group">
                           <td class="px-6 py-3">
                              <img [src]="car.image || (car.images && car.images[0])" class="w-16 h-12 object-cover rounded shadow-sm border border-slate-200">
                           </td>
                           <td class="px-6 py-3 text-sm text-slate-700 max-w-[200px] truncate" [title]="car.title || '-'">{{ car.title || '-' }}</td>
                           <td class="px-6 py-3 font-bold text-slate-900">{{ car.brand }} {{ car.model }}</td>
                           <td class="px-6 py-3 text-sm text-slate-500">
                              {{ car.year }} / {{ car.km | number }} KM
                           </td>
                           <td class="px-6 py-3 font-bold text-slate-900">{{ car.price | turkishCurrency }}</td>
                           <td class="px-6 py-3">
                              <span [class]="car.isAvailable !== false ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'" class="px-2 py-1 rounded text-xs font-bold inline-flex items-center">
                                 <span class="w-1.5 h-1.5 rounded-full mr-1" [class]="car.isAvailable !== false ? 'bg-blue-500' : 'bg-red-500'"></span>
                                 {{ car.isAvailable !== false ? 'Satışta' : 'Satıldı' }}
                              </span>
                           </td>
                           <td class="px-6 py-3 text-right space-x-2">
                              <button (click)="editCar(car)" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                 Düzenle
                              </button>
                              <button (click)="deleteCar(car.id)" class="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                 Sil
                              </button>
                           </td>
                        </tr>
                     }
                 }
              </tbody>
           </table>
        </div>
    </div>
    </div>
    }
  `
})
export class AdminCarsComponent implements OnInit {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  
  cars = this.carService.getCars();
  saleCars = this.carService.getSaleCars();

  activeTab = signal<'RENTAL' | 'SALES'>('RENTAL');
  showForm = signal(false);
  formType = signal<'RENTAL' | 'SALES' | null>(null);
  isPageMenuOpen = signal(false);
  isEditing = false;
  activeImageIndex = 0;
  currentStep = signal(1);

  ngOnInit() {
      this.route.queryParams.subscribe(params => {
          if (params['tab']) {
              this.activeTab.set(params['tab'] as 'RENTAL' | 'SALES');
          } else if (this.router.url.includes('sales')) {
              this.activeTab.set('SALES');
          }
      });

      void this.carService.ensureVehicleCloudInventory().catch((error) => {
          console.error('Vehicle cloud initialization failed', error);
          this.toastService.show(
              'Bulut araç veritabanına bağlanılamadı. İlan değişiklikleri buluta yazılmadan yayınlanmayacak.',
              'error'
          );
      });
  }

  // Default Models
  defaultRentalCar = {
     id: 0,
     title: '',
     brand: '', 
     model: '', 
     price: 0, 
     type: 'SUV', 
     image: '', 
     images: [] as string[],
     seats: 5, 
     features: ['Klima', 'Bluetooth', 'ABS'], 
     isAvailable: true, 
     fuel: 'Dizel', 
     transmission: 'Otomatik',
     deposit: 5000,
     minAge: 21,
     minLicenseYears: 2,
     dailyMileageLimit: 300,
     description: ''
  };

  defaultVehicle: any = {
      id: 0,
      title: '',
      brand: '',
      model: '',
      year: 2023,
      km: 0,
      price: 0,
      image: '',
      images: [] as string[],
      description: '',
      features: [],
      detailedFeatures: {
          interior: [],
          exterior: [],
          multimedia: [],
          safety: []
      },
      color: '',
      engineVolume: '',
      enginePower: '',
      drivetrain: '',
      warranty: '',
      damageStatus: '',
      expertReport: '',
      tramer: '',
      isDamageFree: true,
      transmission: 'Otomatik',
      fuel: 'Dizel'
  };

  currentCar: any = { ...this.defaultRentalCar };

  openForm() {
      this.isEditing = false;
      this.formType.set(this.activeTab()); // Set form type independent of the background tab
      this.currentCar = this.formType() === 'RENTAL' ? { ...this.defaultRentalCar, images: [] } : { ...this.defaultVehicle, images: [] };
      this.activeImageIndex = 0;
      this.currentStep.set(1);
      this.showForm.set(true);
  }

  closeForm() {
      this.showForm.set(false);
      this.formType.set(null);
  }

  editCar(car: any) {
      this.isEditing = true;
      // Set the form type based on category
      this.formType.set(car.category === 'SALE' ? 'SALES' : 'RENTAL');
      this.currentCar = { ...car }; // Clone
      // Ensure images array exists
      if (!this.currentCar.images) {
          this.currentCar.images = this.currentCar.image ? [this.currentCar.image] : [];
      }
      this.activeImageIndex = 0;
      this.currentStep.set(1);
      this.showForm.set(true);
  }

  addBookedDate(startDateInput: HTMLInputElement, endDateInput: HTMLInputElement) {
      if (!startDateInput.value || !endDateInput.value) return;
      if (!this.currentCar.bookedDates) {
          this.currentCar.bookedDates = [];
      }
      this.currentCar.bookedDates.push({ start: startDateInput.value, end: endDateInput.value });
      startDateInput.value = '';
      endDateInput.value = '';
  }

  removeBookedDate(index: number) {
      if (this.currentCar.bookedDates) {
          this.currentCar.bookedDates.splice(index, 1);
      }
  }

  onFileSelected(event: any) {
      const files = event.target.files;
      if (files && files.length > 0) {
          // Initialize images array if it doesn't exist
          if (!this.currentCar.images) {
              this.currentCar.images = [];
          }

          // Process each file
          for (let i = 0; i < files.length; i++) {
              if (this.currentCar.images.length >= 30) {
                  this.toastService.show('En fazla 30 fotoğraf yükleyebilirsiniz.', 'error');
                  break;
              }

              const reader = new FileReader();
              reader.onload = (e: any) => {
                  this.currentCar.images.push(e.target.result);
                  // Set main image if it's the first one
                  if (this.currentCar.images.length === 1) {
                      this.currentCar.image = e.target.result;
                  }
              };
              reader.readAsDataURL(files[i]);
          }
      }
  }

  removeImage(index: number) {
      this.currentCar.images.splice(index, 1);
      // Update main image
      if (this.currentCar.images.length > 0) {
          this.currentCar.image = this.currentCar.images[0];
          if (this.activeImageIndex >= this.currentCar.images.length) {
              this.activeImageIndex = this.currentCar.images.length - 1;
          }
      } else {
          this.currentCar.image = '';
          this.activeImageIndex = 0;
      }
  }

  updateDetailedFeatures(category: 'interior' | 'exterior' | 'multimedia' | 'safety', value: string) {
      if (!this.currentCar.detailedFeatures) {
          this.currentCar.detailedFeatures = { interior: [], exterior: [], multimedia: [], safety: [] };
      }
      this.currentCar.detailedFeatures[category] = value.split(',').map(s => s.trim()).filter(s => s);
  }

  async saveCar() {
      if (!this.currentCar.brand || !this.currentCar.model || !this.currentCar.price) {
          this.toastService.show('Lütfen Marka, Model ve Fiyat alanlarını doldurun.', 'error');
          return;
      }

      if (this.currentCar.images && this.currentCar.images.length > 0) {
          this.currentCar.image = this.currentCar.images[0];
      } else if (!this.currentCar.image) {
          this.currentCar.image = `https://picsum.photos/seed/${this.currentCar.brand}/800/600`;
          this.currentCar.images = [this.currentCar.image];
      }

      try {
          if (this.formType() === 'RENTAL') {
              this.currentCar.category = 'RENTAL';
              this.currentCar = await this.carService.addCar(this.currentCar);
          } else {
              this.currentCar.category = 'SALE';
              this.currentCar = await this.carService.addSaleCar(this.currentCar);
          }

          this.toastService.show(
              this.isEditing ? 'Araç güncellendi ve canlı siteye kaydedildi.' : 'Yeni ilan canlı siteye kaydedildi.',
              'success'
          );
          this.closeForm();
      } catch (error) {
          console.error('Vehicle save failed', error);
          this.toastService.show(
              error instanceof Error ? error.message : 'Araç kaydedilemedi. Lütfen tekrar deneyin.',
              'error'
          );
      }
  }

  async deleteCar(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Aracı Sil',
          message: 'Bu aracı silmek istediğinize emin misiniz?'
      });
      if(confirmed) {
          try {
              if (this.activeTab() === 'RENTAL') {
                  await this.carService.deleteCar(id);
              } else {
                  await this.carService.deleteSaleCar(id);
              }
              this.toastService.show('Araç buluttan ve canlı siteden silindi.', 'info');
          } catch (error) {
              console.error('Vehicle delete failed', error);
              this.toastService.show('Araç silinemedi. Bulut bağlantısını kontrol edip tekrar deneyin.', 'error');
          }
      }
  }
}

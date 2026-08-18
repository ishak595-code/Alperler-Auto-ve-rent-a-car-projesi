import { Component, OnInit, signal, OnDestroy, inject } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-track-car",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-screen bg-slate-100 flex flex-col md:flex-row relative overflow-hidden">
      <!-- Main Map Area -->
      <div class="flex-1 flex flex-col relative bg-[#e5e3df] overflow-hidden order-2 md:order-1 h-full">
        <!-- Header -->
        <div class="bg-white/90 backdrop-blur px-6 py-4 shadow-sm relative z-20 flex items-center justify-between border-b border-slate-200">
          <div class="flex items-center gap-4">
            <button type="button" (click)="goBack()" aria-label="Canlı takip ekranından geri dön" class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 transition-colors">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="text-xl font-bold text-slate-900 tracking-tight">Canlı Takip: {{ bookingId }}</h1>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-medium text-slate-500 uppercase tracking-wider">GPS Bağlantısı Aktif</span>
              </div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <mat-icon class="text-blue-500">speed</mat-icon>
            <span class="font-bold text-slate-700 font-mono text-lg">{{ speed() }} <span class="text-sm font-medium text-slate-400">km/s</span></span>
          </div>
        </div>

        <!-- SVG Grid Background -->
        <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#94a3b8 1px, transparent 1px); background-size: 20px 20px;"></div>
        
        <!-- Mock Roads -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <path d="M 0 300 Q 400 300 800 100 T 1600 500" stroke="#cbd5e1" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M 400 0 L 400 800" stroke="#cbd5e1" stroke-width="15" fill="none"/>
          <path d="M -100 500 Q 300 600 700 400 T 1500 200" stroke="#cbd5e1" stroke-width="20" fill="none" stroke-linecap="round"/>
          <path d="M 1200 -100 L 1000 900" stroke="#cbd5e1" stroke-width="10" fill="none"/>
        </svg>

        <!-- Dynamic GPS Route Line -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <!-- Shadow -->
          <path [attr.d]="routePath()" stroke="rgba(0,0,0,0.1)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-1000" transform="translate(0, 5)"/>
          <!-- Route -->
          <path [attr.d]="routePath()" stroke="#3b82f6" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-1000 origin-center"/>
          <!-- Future Route (Dotted) -->
          <path d="M 800 100 T 1600 500" stroke="#94a3b8" stroke-width="4" fill="none" stroke-dasharray="10,10" stroke-linecap="round" opacity="0.5"/>
        </svg>

        <!-- Car Marker -->
        <div 
          class="absolute w-12 h-12 -ml-6 -mt-6 transition-all duration-1000 ease-linear z-10 flex items-center justify-center filter drop-shadow-xl"
          [style.left.px]="carPosition().x"
          [style.top.px]="carPosition().y"
        >
          <!-- Outer Ping -->
          <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30"></div>
          <!-- Inner Marker -->
          <div class="w-10 h-10 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative transform rotate-45">
             <div class="w-full h-full absolute inset-0 bg-slate-900 border-2 border-white" style="border-radius: 50% 50% 50% 0;"></div>
             <mat-icon class="relative z-10 text-white !text-[20px] !w-[20px] !h-[20px] -rotate-45" style="margin-left: 2px; margin-top: -2px;">directions_car</mat-icon>
          </div>
        </div>

        <!-- Start/End Markers -->
        <div class="absolute w-6 h-6 bg-slate-900 border-4 border-white rounded-full shadow-md z-0 flex items-center justify-center" style="left: 157px; top: 317px; transform: translate(-50%, -50%);">
        </div>
        <div class="absolute w-8 h-8 bg-emerald-500 border-4 border-white rounded-full shadow-md z-0 flex items-center justify-center" style="left: 1400px; top: 400px; transform: translate(-50%, -50%);">
          <mat-icon class="text-white !text-[14px] !w-[14px] !h-[14px]">flag</mat-icon>
        </div>

        <!-- Map Controls -->
        <div class="absolute right-6 bottom-6 flex flex-col gap-2 z-20">
          <button type="button" title="Yakınlaştır" aria-label="Haritayı yakınlaştır" class="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors flex items-center justify-center active:scale-95">
            <mat-icon>add</mat-icon>
          </button>
          <button type="button" title="Uzaklaştır" aria-label="Haritayı uzaklaştır" class="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors flex items-center justify-center active:scale-95">
            <mat-icon>remove</mat-icon>
          </button>
          <button type="button" title="Aracı Ortala" aria-label="Aracı haritada ortala" class="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center active:scale-95 mt-2">
            <mat-icon>my_location</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right Control Panel -->
      <div class="w-full md:w-[400px] h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-30 order-1 md:order-2 overflow-y-auto hidden-scrollbar">
        <!-- Renter Profile -->
        <div class="p-6 border-b border-slate-100 bg-slate-50/50">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Sürücü Bilgileri</span>
            <span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Doğrulanmış</span>
          </div>
          <div class="flex items-center gap-4">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Renter" class="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover">
            <div class="flex-1">
              <h3 class="font-bold text-slate-900 text-lg">Ahmet Yılmaz</h3>
              <p class="text-sm text-slate-500 font-medium">+90 532 123 45 67</p>
              <p class="text-xs text-slate-400 mt-1">TC: 1234*****89</p>
            </div>
            <button type="button" aria-label="Sürücüyü telefonla ara" class="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95">
              <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">phone</mat-icon>
            </button>
          </div>
        </div>

        <!-- Telemetry -->
        <div class="p-6 grid grid-cols-2 gap-4 border-b border-slate-100">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <mat-icon class="text-blue-500 mb-2">speed</mat-icon>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Anlık Hız</div>
            <div class="text-2xl font-black text-slate-900">{{ speed() }} <span class="text-sm text-slate-500 font-medium">km/s</span></div>
          </div>
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <mat-icon class="text-emerald-500 mb-2">local_gas_station</mat-icon>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Yakıt / Menzil</div>
            <div class="text-2xl font-black text-slate-900">74% <span class="text-sm text-slate-500 font-medium">520km</span></div>
          </div>
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Kalan Mesafe</div>
              <div class="text-2xl font-black text-slate-900">{{ distanceRemaining() }} <span class="text-sm text-slate-500 font-medium">km</span></div>
            </div>
            <div class="text-right">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tahmini Varış</div>
              <div class="text-xl font-bold text-blue-600">{{ eta() }}</div>
            </div>
          </div>
        </div>

        <!-- Vehicle Controls -->
        <div class="p-6 flex-1 bg-white">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Uzaktan Araç Kontrolü</span>
          
          <div class="space-y-3">
            <!-- Engine Stop -->
            <button 
              (click)="triggerAction('engine')"
              [disabled]="actionState().engine === 'loading'"
              class="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all relative overflow-hidden group"
              [ngClass]="{
                'border-red-100 bg-red-50 hover:border-red-200': engineStatus() === 'on',
                'border-emerald-100 bg-emerald-50 hover:border-emerald-200': engineStatus() === 'off'
              }"
            >
              <div class="flex items-center gap-4 relative z-10">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                     [ngClass]="engineStatus() === 'on' ? 'bg-red-500' : 'bg-emerald-500'">
                  @if (actionState().engine === 'loading') {
                    <mat-icon class="animate-spin">autorenew</mat-icon>
                  } @else {
                    <mat-icon>power_settings_new</mat-icon>
                  }
                </div>
                <div class="text-left">
                  <div class="font-bold text-slate-900 text-lg">
                    {{ engineStatus() === 'on' ? 'Motoru Durdur' : 'Motoru İzin Ver' }}
                  </div>
                  <div class="text-xs font-medium" [ngClass]="engineStatus() === 'on' ? 'text-red-600' : 'text-emerald-700'">
                    GPRS ile sinyal gönder
                  </div>
                </div>
              </div>
            </button>

            <!-- Doors Lock -->
            <button 
              (click)="triggerAction('doors')"
              [disabled]="actionState().doors === 'loading'"
              class="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group"
              [ngClass]="{
                'border-amber-100 bg-amber-50 hover:border-amber-200': doorsStatus() === 'unlocked',
                'border-slate-200 bg-white hover:border-slate-300': doorsStatus() === 'locked'
              }"
            >
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-slate-700 bg-white shadow-sm border border-slate-200">
                  @if (actionState().doors === 'loading') {
                    <mat-icon class="animate-spin text-amber-500">autorenew</mat-icon>
                  } @else {
                    <mat-icon>{{ doorsStatus() === 'locked' ? 'lock' : 'lock_open' }}</mat-icon>
                  }
                </div>
                <div class="text-left">
                  <div class="font-bold text-slate-900 text-lg">
                    {{ doorsStatus() === 'locked' ? 'Kapıları Aç' : 'Kapıları Kilitle' }}
                  </div>
                  <div class="text-xs font-medium text-slate-500">
                    Uzaktan kilit kontrolü
                  </div>
                </div>
              </div>
            </button>

            <!-- Alarm / Horn -->
            <button 
              (click)="triggerAction('alarm')"
              [disabled]="actionState().alarm === 'loading'"
              class="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 bg-white transition-all group"
            >
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-amber-500 bg-amber-50 shadow-sm border border-amber-100">
                @if (actionState().alarm === 'loading') {
                  <mat-icon class="animate-spin">autorenew</mat-icon>
                } @else {
                  <mat-icon>volume_up</mat-icon>
                }
              </div>
              <div class="text-left">
                <div class="font-bold text-slate-900 text-lg">
                  Korna / Flaşör Çal
                </div>
                <div class="text-xs font-medium text-slate-500">
                  Aracı bulmak için sinyal
                </div>
              </div>
            </button>
          </div>

          <!-- Bottom Action -->
          <div class="mt-6 pt-6 border-t border-slate-100">
            <button class="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-lg hover:shadow-blue-600/30 active:scale-95">
              <mat-icon>message</mat-icon>
              Sürücüye Mesaj Gönder
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification (Absolute) -->
    @if (toastMessage()) {
      <div class="fixed top-6 right-6 lg:right-[424px] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in">
        <mat-icon class="text-emerald-400">check_circle</mat-icon>
        <div>
          <div class="font-bold text-sm tracking-wide">{{ toastTitle() }}</div>
          <div class="text-slate-300 text-xs mt-0.5">{{ toastMessage() }}</div>
        </div>
      </div>
    }
  `,
  styles: [`
    .hidden-scrollbar::-webkit-scrollbar { display: none; }
    .hidden-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class TrackCarComponent implements OnInit, OnDestroy {
  bookingId: string = "BKN-8234";
  
  // GPS State Signals
  carPosition = signal({ x: 160, y: 320 });
  routePath = signal('M 160 320');
  speed = signal(0);
  distanceRemaining = signal(42.5);
  eta = signal('45 dk');

  // Control Signals
  engineStatus = signal<'on'|'off'>('on');
  doorsStatus = signal<'unlocked'|'locked'>('unlocked');
  actionState = signal<{engine: string, doors: string, alarm: string}>({engine: 'idle', doors: 'idle', alarm: 'idle'});

  // Toast
  toastTitle = signal('');
  toastMessage = signal('');
  private toastTimeout: any;

  private intervalId: any;
  private pathPoints: {x: number, y: number}[] = [{x: 160, y: 320}];

  private location = inject(Location);
  
  constructor(private route: ActivatedRoute) {}

  goBack() {
    this.location.back();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bookingId = params['id'].toUpperCase();
      }
    });

    if (typeof window !== 'undefined') {
      this.startGpsSimulation();
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  triggerAction(action: 'engine' | 'doors' | 'alarm') {
    // Set loading state
    this.actionState.update(s => ({...s, [action]: 'loading'}));

    // Simulate API call to vehicle telematics
    setTimeout(() => {
      let title = '';
      let msg = '';

      if (action === 'engine') {
        const newStatus = this.engineStatus() === 'on' ? 'off' : 'on';
        this.engineStatus.set(newStatus);
        
        if (newStatus === 'off') {
          title = 'Motor Durduruldu';
          msg = 'Araç GPRS komutuyla güvenli şekilde bloke edildi.';
          this.speed.set(0);
          if (this.intervalId) clearInterval(this.intervalId); // Stop moving
        } else {
          title = 'Motor İzni Verildi';
          msg = 'Araç blokajı kaldırıldı, sürüşe hazır.';
          this.startGpsSimulation(); // Resume
        }
      } else if (action === 'doors') {
        const newStatus = this.doorsStatus() === 'locked' ? 'unlocked' : 'locked';
        this.doorsStatus.set(newStatus);
        title = newStatus === 'locked' ? 'Kapılar Kilitlendi' : 'Kapılar Açıldı';
        msg = 'Kilit mekanizması uzaktan kontrol ile tetiklendi.';
      } else if (action === 'alarm') {
        title = 'Sinyal Gönderildi';
        msg = 'Aracın 5 saniye boyunca flaşörleri ve kornası aktif edildi.';
      }

      this.actionState.update(s => ({...s, [action]: 'idle'}));
      this.showToast(title, msg);
    }, 1500);
  }

  private showToast(title: string, message: string) {
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }

  private startGpsSimulation() {
    if (this.intervalId) clearInterval(this.intervalId);
    
    this.intervalId = setInterval(() => {
      const current = this.carPosition();
      
      const deltaX = Math.random() * 20 + 10;
      const progressFactor = current.x / 800; // 0 to 1 based on x progress
      const targetY = 300 - (progressFactor * 200); // 300 to 100
      
      const nextX = current.x + deltaX;
      // Interpolate towards target curve
      const nextY = current.y + (targetY - current.y) * 0.1 + (Math.random() * 4 - 2);

      // Random speed fluctuations (kph)
      this.speed.set(Math.floor(Math.random() * 30 + 40));
      
      // Distance countdown
      const currDist = this.distanceRemaining();
      if (currDist > 0) {
        this.distanceRemaining.set(Number((currDist - 0.1).toFixed(1)));
        
        let mins = Math.floor(Math.random() * 2 + (currDist * 0.8));
        this.eta.set(`${mins} dk`);
      }

      this.carPosition.set({ x: nextX, y: nextY });
      
      this.pathPoints.push({ x: nextX, y: nextY });
      const newPath = this.pathPoints.map((p, i) => i === 0 ? 'M ' + p.x + ' ' + p.y : 'L ' + p.x + ' ' + p.y).join(' ');
      this.routePath.set(newPath);

      // Stop near end
      if (nextX > 1400) {
        clearInterval(this.intervalId);
        this.speed.set(0);
        this.distanceRemaining.set(0);
        this.eta.set('Varıldı');
        this.showToast('Varış Noktasına Ulaşıldı', 'Araç planlanan güzergahı tamamladı.');
      }
    }, 2000); // Wait 2s between mock GPS pings
  }
}

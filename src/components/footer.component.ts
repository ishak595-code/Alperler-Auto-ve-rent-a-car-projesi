import { Component, inject, signal } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <footer
      class="bg-slate-950 text-slate-400 pt-16 border-t border-slate-900 font-sans"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"
        >
          <!-- Brand Info -->
          <div class="col-span-1">
            <div
              class="flex items-center mb-6 group cursor-pointer"
              routerLink="/"
            >
              @if (config().logoUrl) {
                <img
                  [src]="config().logoUrl"
                  alt="Alperler Auto Logo"
                  class="h-10 object-contain mr-3"
                />
              } @else {
                <!-- VIP Geometric Nano Logo Fallback -->
                <div
                  class="w-10 h-10 flex items-center justify-center mr-2 md:mr-3 drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                >
                  <svg
                    class="w-full h-full text-blue-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M50 5L15 85H30L50 40L70 85H85L50 5Z"
                      fill="currentColor"
                    />
                    <path d="M35 70H65V85H35V70Z" fill="white" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-dasharray="10 4"
                      opacity="0.3"
                    />
                  </svg>
                </div>
                <div class="flex flex-col justify-center">
                  <span
                    class="font-serif font-bold text-xl md:text-2xl text-white tracking-widest leading-none group-hover:text-blue-500 transition-colors"
                    >{{ config().companyName | uppercase }}</span
                  >
                  @if (config().tagline) {
                    <span
                      class="text-[0.45rem] md:text-[0.55rem] text-slate-400 font-bold tracking-widest uppercase mt-1 text-justify w-full pl-1"
                      style="letter-spacing: 0.1em;"
                      >{{ config().tagline }}</span
                    >
                  }
                </div>
              }
            </div>
            <p class="text-slate-500 mb-4 leading-relaxed text-sm">
              {{ t().footer.footerText }}
            </p>
            <p
              class="text-slate-700 text-[10px] mb-6 leading-relaxed font-medium italic"
            >
              *Zamanınızın ve konforunuzun değerini biliyoruz. Size sadece bir araç değil, ayrıcalıklı bir ulaşım deneyimi vadediyoruz.
            </p>

            <!-- Social Media Icons (Clean Row) -->
            <div class="mt-8">
              <span
                class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4"
                >Bizi Takip Edin</span
              >
              <div class="flex flex-wrap gap-4">
                <a
                  [href]="'https://wa.me/' + config().whatsapp"
                  target="_blank"
                  aria-label="WhatsApp"
                  class="text-slate-400 hover:text-green-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-green-500/30"
                >
                  <svg
                    class="w-4 h-4 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
                    />
                  </svg>
                  <span class="sr-only font-bold">WhatsApp</span>
                </a>
                <a
                  [href]="config().instagramUrl"
                  target="_blank"
                  aria-label="Instagram"
                  class="text-slate-400 hover:text-pink-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-pink-500/30"
                >
                  <svg
                    class="w-4 h-4 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                    />
                  </svg>
                  <span class="sr-only font-bold">Instagram</span>
                </a>
                <a
                  href="javascript:void(0)"
                  aria-label="X (Twitter)"
                  class="text-slate-400 hover:text-white transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-500/30"
                >
                  <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span class="sr-only font-bold">X</span>
                </a>
                <a
                  href="javascript:void(0)"
                  aria-label="Facebook"
                  class="text-slate-400 hover:text-blue-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-blue-500/30"
                >
                  <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                  </svg>
                  <span class="sr-only font-bold">Facebook</span>
                </a>
                <a
                  href="javascript:void(0)"
                  aria-label="YouTube"
                  class="text-slate-400 hover:text-red-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-red-500/30"
                >
                  <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span class="sr-only font-bold">YouTube</span>
                </a>
                <a
                  href="javascript:void(0)"
                  aria-label="TikTok"
                  class="text-slate-400 hover:text-white transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-500/30"
                >
                  <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  <span class="sr-only font-bold">TikTok</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Quick Links -->
          <div>
            <h3
              class="text-white font-bold uppercase tracking-wider text-xs mb-6 text-blue-500"
            >
              {{ t().footer.corporate }}
            </h3>
            <ul class="space-y-4 text-sm">
              <li>
                <a
                  routerLink="/about"
                  class="text-slate-400 hover:text-white transition-colors flex items-center group"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().nav.about }}
                </a>
              </li>
              <li>
                <a
                  routerLink="/fleet"
                  class="text-slate-400 hover:text-white transition-colors flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().nav.fleet }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/sales"
                  class="text-slate-400 hover:text-white transition-colors flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().nav.sales }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/list-your-car"
                  class="text-slate-400 hover:text-white transition-colors flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().nav.earn }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/blog"
                  class="text-slate-400 hover:text-white transition-colors flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().nav.blog }}</a
                >
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h3
              class="text-white font-bold uppercase tracking-wider text-xs mb-6 text-blue-500"
            >
              {{ t().footer.legal }}
            </h3>
            <ul class="space-y-4 text-sm">
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'terms' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.terms }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'distance-selling' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.distanceSelling }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'cancellation' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.cancellation }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'insurance' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.insurance }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'kvkk' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.kvkk }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'privacy' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.privacy }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/legal"
                  [queryParams]="{ type: 'cookies' }"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.cookies }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/faq"
                  class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"
                  ><span
                    class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ></span
                  >{{ t().footer.links.faq }}</a
                >
              </li>
              <!-- Feedback Link -->
              <li>
                <button
                  (click)="openFeedback()"
                  class="text-blue-500 hover:text-blue-400 transition-colors font-medium flex items-center mt-2 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20 w-fit"
                >
                  <svg
                    class="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  {{ t().footer.feedbackBtn }}
                </button>
              </li>
            </ul>
          </div>

          <!-- Newsletter & Contact -->
          <div>
            <h3
              class="text-white font-bold uppercase tracking-wider text-xs mb-6 text-blue-500"
            >
              {{ t().footer.newsletter }}
            </h3>
            <p class="text-sm text-slate-500 mb-4">
              {{ t().footer.newsletterSub }}
            </p>

            <form (submit)="subscribe($event)" class="mb-8">
              <div class="flex flex-col space-y-2">
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  [attr.aria-label]="t().footer.emailPlaceholder"
                  [placeholder]="t().footer.emailPlaceholder"
                  required
                  class="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-3 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  class="bg-blue-500 hover:bg-blue-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  {{ t().footer.subscribeBtn }}
                  <svg
                    class="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
              @if (subscribed()) {
                <div
                  class="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start animate-fade-in"
                >
                  <svg
                    class="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="text-green-500 text-xs font-bold">
                    {{ t().footer.subscribeSuccess }}
                  </p>
                </div>
              }
            </form>

            <h3
              class="text-white font-bold uppercase tracking-wider text-xs mb-4 text-blue-500"
            >
              {{ t().footer.contactUs }}
            </h3>
            <button
              (click)="openContact()"
              class="inline-flex items-center justify-center bg-slate-800 hover:bg-white hover:text-slate-900 text-slate-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 w-full border border-slate-700 hover:border-white"
            >
              {{ t().footer.contactBtn }}
            </button>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div
          class="border-t border-slate-900 py-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 relative"
        >
          <div class="mb-4 md:mb-0 text-center md:text-left w-full md:w-auto">
            <span
              >&copy; {{ currentYear }} {{ config().companyName }}.
              {{ t().footer.rights }}</span
            >
            <a
              routerLink="/admin/login"
              class="ml-2 text-slate-800 hover:text-slate-600 transition-colors"
              aria-label="Yönetici Girişi"
            >
              <svg
                class="w-3 h-3 inline-block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </a>
          </div>
          <div
            class="flex items-center justify-center md:justify-end w-full md:w-auto"
          >
            <span>{{ t().footer.designed }}</span>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  config = this.carService.getConfig();
  t = this.uiService.translations;
  currentYear = new Date().getFullYear();

  email = "";
  subscribed = signal(false);

  subscribe(e: Event) {
    e.preventDefault();
    if (this.email) {
      this.carService.addSubscriber(this.email);
      this.subscribed.set(true);
      this.email = "";
      setTimeout(() => this.subscribed.set(false), 3000);
    }
  }

  openAbout() {
    this.router.navigate(["/about"]);
  }

  openContact() {
    this.router.navigate(["/contact"]);
  }

  openLegal(type: string) {
    this.router.navigate(["/legal"], { queryParams: { type } });
  }

  openFeedback() {
    this.uiService.toggleFeedback(true);
  }
}

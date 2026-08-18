import { Component, inject, signal, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-gemini-advisor",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed bottom-6 right-6 z-40 font-sans"
      [class.hidden]="!isVisible()"
    >
      <!-- Toggle Button -->
      @if (!isOpen()) {
        <div class="relative">
          @if (showWelcomeBubble()) {
            <div
              class="absolute bottom-full right-0 mb-4 w-64 bg-white p-4 rounded-2xl shadow-xl border border-slate-200 animate-fade-in-up"
            >
              <div class="relative">
                <p class="text-sm font-semibold text-slate-800">
                  Sana en uygun aracı bulmamı ister misin?
                </p>
                <button
                  type="button"
                  (click)="showWelcomeBubble.set(false)"
                  aria-label="Karşılama mesajını kapat"
                  class="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <!-- Little triangle pointer -->
                <div
                  class="absolute -bottom-6 right-6 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45"
                ></div>
              </div>
            </div>
          }
          <button
            (click)="toggleChat()"
            aria-label="Canlı Desteği Aç"
            class="bg-slate-900 hover:bg-blue-600 text-white rounded-full p-4 shadow-2xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center border border-white/10 group"
          >
            <div class="relative">
              <svg
                class="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span
                class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"
              ></span>
            </div>
          </button>
        </div>
      }

      <!-- Chat Interface -->
      @if (isOpen()) {
        <div
          class="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden border border-slate-200 flex flex-col max-h-[600px] transition-all duration-300 animate-fade-in-up relative"
        >
          <!-- VOICE MODE OVERLAY -->
          @if (isConversationMode()) {
            <div
              class="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in"
            >
              <button
                type="button"
                (click)="toggleConversationMode()"
                aria-label="Sesli görüşme modunu kapat"
                class="absolute top-4 right-4 text-white/70 hover:text-white p-2"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <!-- Status Indicator -->
              <div class="mb-8 relative">
                @if (isListening()) {
                  <div
                    class="w-32 h-32 rounded-full bg-red-500/20 animate-ping absolute inset-0"
                  ></div>
                  <div
                    class="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] relative z-10 transition-all duration-300"
                  >
                    <svg
                      class="w-12 h-12 text-white animate-pulse"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  <p class="mt-6 text-xl font-bold text-red-400 animate-pulse">
                    {{ t().chat.listening }}
                  </p>
                } @else if (isSpeaking()) {
                  <div
                    class="w-32 h-32 rounded-full bg-blue-500/20 animate-ping absolute inset-0"
                  ></div>
                  <div
                    class="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] relative z-10 transition-all duration-300"
                  >
                    <div class="flex gap-1 items-center h-8">
                      <div
                        class="w-1.5 bg-white animate-[music-bar_1s_ease-in-out_infinite] h-4"
                      ></div>
                      <div
                        class="w-1.5 bg-white animate-[music-bar_1.2s_ease-in-out_infinite] h-8"
                      ></div>
                      <div
                        class="w-1.5 bg-white animate-[music-bar_0.8s_ease-in-out_infinite] h-6"
                      ></div>
                      <div
                        class="w-1.5 bg-white animate-[music-bar_1.1s_ease-in-out_infinite] h-3"
                      ></div>
                    </div>
                  </div>
                  <p class="mt-6 text-xl font-bold text-blue-400">
                    {{ t().chat.speaking }}
                  </p>
                } @else if (isLoading()) {
                  <div
                    class="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center relative z-10"
                  >
                    <svg
                      class="w-12 h-12 text-slate-400 animate-spin"
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
                  </div>
                  <p class="mt-6 text-xl font-bold text-slate-400">
                    {{ t().chat.thinking }}
                  </p>
                } @else {
                  <div
                    class="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center relative z-10 cursor-pointer hover:bg-slate-600 transition-colors"
                    (click)="startListening()"
                  >
                    <svg
                      class="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  <p class="mt-6 text-xl font-bold text-white">
                    {{ t().chat.tapToSpeak }}
                  </p>
                }
              </div>

              <!-- Transcript / Subtitles -->
              <div
                class="h-24 w-full max-w-xs flex items-center justify-center"
              >
                <p class="text-slate-300 text-sm italic leading-relaxed">
                  {{ currentInput || (isSpeaking() ? "..." : t().chat.prompt) }}
                </p>
              </div>

              <!-- Controls -->
              <div class="flex gap-6 mt-4">
                <button
                  type="button"
                  (click)="toggleVoice()"
                  [attr.aria-label]="isVoiceEnabled() ? 'Asistan sesini kapat' : 'Asistan sesini aç'"
                  class="p-4 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                  [class.text-red-400]="!isVoiceEnabled()"
                  [class.text-green-400]="isVoiceEnabled()"
                >
                  @if (isVoiceEnabled()) {
                    <svg
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  } @else {
                    <svg
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  }
                </button>

                <button
                  type="button"
                  (click)="stopSpeaking()"
                  aria-label="Asistan konuşmasını durdur"
                  class="p-4 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors"
                >
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
              </div>
            </div>
          }

          <!-- Header -->
          <div
            class="bg-slate-900 p-4 flex justify-between items-center shadow-md z-10 relative"
          >
            <div class="flex items-center text-white">
              <div
                class="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3 shadow-sm border-2 border-slate-800 relative"
              >
                <span class="text-slate-900 font-extrabold text-lg">A</span>
                <span
                  class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                ></span>
              </div>
              <div>
                <h3 class="font-bold text-base flex items-center gap-2">
                  Alper AI
                </h3>
                <p class="text-xs text-slate-400">
                  {{ t().chat.subtitle }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- Voice Mode Button -->
              <button
                (click)="toggleConversationMode()"
                class="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all shadow-lg animate-pulse"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                {{ t().chat.voiceAssistant }}
              </button>

              <button
                (click)="toggleChat()"
                aria-label="Sohbeti Kapat"
                class="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div
            class="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 min-h-[350px]"
          >
            <div class="flex items-start">
              <div
                class="bg-white border border-slate-200 text-slate-800 p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm"
              >
                <p class="font-semibold text-blue-900 text-xs mb-1">Alper AI</p>
                {{ t().chat.welcome }}
              </div>
            </div>

            @for (msg of messages(); track $index) {
              <div class="flex" [class.justify-end]="msg.isUser">
                <div
                  class="p-3 rounded-2xl text-sm max-w-[85%]"
                  [class.bg-blue-900]="msg.isUser"
                  [class.text-white]="msg.isUser"
                  [class.rounded-tr-none]="msg.isUser"
                  [class.bg-white]="!msg.isUser"
                  [class.text-slate-800]="!msg.isUser"
                  [class.shadow-sm]="!msg.isUser"
                  [class.border]="!msg.isUser"
                  [class.border-slate-200]="!msg.isUser"
                  [class.rounded-tl-none]="!msg.isUser"
                >
                  @if (!msg.isUser) {
                    <p class="font-semibold text-blue-900 text-xs mb-1">
                      Alper AI
                    </p>
                  }
                  {{ msg.text }}
                </div>
              </div>
            }

            @if (isLoading()) {
              <div class="flex items-center space-x-2 p-2">
                <div
                  class="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                ></div>
                <div
                  class="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-75"
                ></div>
                <div
                  class="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-150"
                ></div>
              </div>
            }
          </div>

          <!-- Input -->
          <div class="p-3 bg-white border-t border-slate-100">
            <form (submit)="sendMessage($event)" class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="currentInput"
                name="userInput"
                [placeholder]="t().chat.placeholder"
                aria-label="Mesajınızı yazın"
                class="flex-1 bg-slate-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                [disabled]="isLoading()"
              />

              <button
                type="submit"
                [disabled]="!currentInput || isLoading()"
                aria-label="Mesajı Gönder"
                class="bg-slate-900 text-white p-2.5 rounded-full hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-md"
              >
                <svg
                  class="w-5 h-5 transform rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class GeminiAdvisorComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  toastService = inject(ToastService);
  isOpen = signal(false);
  isVisible = signal(false);
  hasScrolled = signal(false);
  showWelcomeBubble = signal(false);

  messages = signal<{ text: string; isUser: boolean }[]>([]);
  currentInput = "";
  isLoading = signal(false);

  // Voice State
  isVoiceEnabled = signal(true);
  isListening = signal(false);
  isSpeaking = signal(false);
  isConversationMode = signal(false);
  recognition: any;
  synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  t = this.uiService.translations;

  constructor() {
    this.initSpeechRecognition();

    // Monitor speech synthesis state
    if (typeof window !== "undefined") {
      setInterval(() => {
        if (this.synth) {
          this.isSpeaking.set(this.synth.speaking);
        }
      }, 100);

      // Delayed display
      setTimeout(() => {
        this.isVisible.set(true);
        if (window.scrollY > 150 && !this.hasScrolled()) {
          this.triggerWelcomeBubble();
        }
      }, 10000);

      const scrollHandler = () => {
        if (window.scrollY > 200 && this.isVisible() && !this.hasScrolled()) {
          this.triggerWelcomeBubble();
        }
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });
    }
  }

  triggerWelcomeBubble() {
    this.hasScrolled.set(true);
    if (!this.isOpen()) {
      this.showWelcomeBubble.set(true);
      setTimeout(() => this.showWelcomeBubble.set(false), 6000);
    }
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.showWelcomeBubble.set(false);
      if (this.isVoiceEnabled()) {
        setTimeout(() => this.speak(this.t().chat.welcome), 500);
      }
    } else {
      this.stopSpeaking();
      this.isConversationMode.set(false);
      this.recognition?.stop();
    }
  }

  initSpeechRecognition() {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const v = (window as any).webkitSpeechRecognition;
      this.recognition = new v();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this.currentInput = transcript;
          // Automatically send after a short delay to allow user to see text
          setTimeout(() => {
            this.sendMessage(new Event("submit"));
          }, 500);
        }
        this.isListening.set(false);
      };

      this.recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        this.isListening.set(false);
        if (this.isConversationMode()) {
          this.isConversationMode.set(false);
        }
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };
    }
  }

  toggleVoice() {
    this.isVoiceEnabled.update((v) => !v);
    if (!this.isVoiceEnabled()) {
      this.stopSpeaking();
      this.isConversationMode.set(false);
    }
  }

  toggleConversationMode() {
    this.isConversationMode.update((v) => !v);

    if (this.isConversationMode()) {
      this.isVoiceEnabled.set(true);
      // If AI is currently speaking, let it finish, then it will trigger listening via onend
      // If not speaking, start listening immediately
      if (!this.isSpeaking()) {
        this.startListening();
      }
    } else {
      this.stopSpeaking();
      this.recognition?.stop();
      this.isListening.set(false);
    }
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking.set(false);
    }
  }

  startListening() {
    this.stopSpeaking(); // Stop speaking when listening starts
    if (!this.recognition) {
      this.toastService.show(
        "Tarayıcınız sesli komut özelliğini desteklemiyor.",
        "error",
      );
      return;
    }

    if (this.isListening()) return;

    try {
      // Set language based on current UI language
      const langMap: any = {
        TR: "tr-TR",
        EN: "en-US",
        DE: "de-DE",
        FR: "fr-FR",
        ES: "es-ES",
        RU: "ru-RU",
        ZH: "zh-CN",
        AR: "ar-SA",
      };
      this.recognition.lang = langMap[this.uiService.currentLang()] || "tr-TR";
      this.recognition.start();
      this.isListening.set(true);
    } catch (error: any) {
      // Ignore "already started" error
      if (
        error?.message?.includes("already started") ||
        error?.name === "InvalidStateError"
      ) {
        this.isListening.set(true);
      } else {
        console.error("Speech recognition start error:", error);
        this.isConversationMode.set(false);
      }
    }
  }

  async sendMessage(e: Event) {
    e.preventDefault();
    if (!this.currentInput.trim()) return;

    this.stopSpeaking(); // Stop any previous speech

    const userText = this.currentInput;
    this.messages.update((msgs) => [...msgs, { text: userText, isUser: true }]);
    this.currentInput = "";
    this.isLoading.set(true);

    const response = await this.carService.getAIRecommendation(userText);

    this.messages.update((msgs) => [
      ...msgs,
      { text: response, isUser: false },
    ]);
    this.isLoading.set(false);

    this.speak(response);
  }

  speak(text: string) {
    if (!this.isVoiceEnabled() || !this.synth) return;

    // Strip markdown symbols before speaking
    const cleanText = text.replace(/[*#_`~]/g, "");

    this.synth.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Select Voice
    const voices = this.synth.getVoices();
    const currentLang = this.uiService.currentLang();
    const langCode =
      {
        TR: "tr",
        EN: "en",
        DE: "de",
        FR: "fr",
        ES: "es",
        RU: "ru",
        ZH: "zh",
        AR: "ar",
      }[currentLang] || "tr";

    // Try to find a female voice for the language
    const voice = voices.find(
      (v) =>
        v.lang.startsWith(langCode) &&
        (v.name.includes("Female") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha")),
    );

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => {
      this.isSpeaking.set(false);
      // CONTINUOUS CONVERSATION LOGIC
      if (this.isConversationMode()) {
        setTimeout(() => this.startListening(), 300);
      }
    };
    utterance.onerror = () => {
      this.isSpeaking.set(false);
      this.isConversationMode.set(false);
    };

    this.synth.speak(utterance);
  }
}

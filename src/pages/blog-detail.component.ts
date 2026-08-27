import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DetailMediaLightboxComponent } from "../components/detail-media-lightbox.component";
import { BlogDetailPost, PublicDetailDataService } from "../services/public-detail-data.service";
import { UiService } from "../services/ui.service";

@Component({
  selector: "app-blog-detail",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DetailMediaLightboxComponent],
  template: `
    <main class="page">
      <header class="topbar">
        <div class="bar">
          <button type="button" (click)="goBack()" aria-label="Blog yazısından geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div><p>ALPERLER REHBER</p><strong>{{ post()?.title || 'Blog Yazısı' }}</strong></div>
        </div>
      </header>

      @if(post(); as article){
        @if(activeMedia(); as media){
          <section class="gallery" [attr.aria-label]="article.title + ' fotoğraf ve video galerisi'" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
            <div class="frame">
              @if(media.kind==='IMAGE'){
                <button type="button" class="media-button" (click)="openFullscreen()" [attr.aria-label]="media.title + ' tam ekran aç'">
                  <img [src]="media.url" [alt]="media.title" loading="eager" decoding="async" />
                </button>
              }@else{
                <video [src]="media.url" [poster]="media.posterUrl" controls playsinline preload="metadata" [attr.aria-label]="media.title"></video>
                <button type="button" class="expand" (click)="openFullscreen()" aria-label="Blog videosunu tam ekran galeride aç"><mat-icon aria-hidden="true">fullscreen</mat-icon></button>
              }
              <div class="shade"></div>
              <div class="hero-copy"><p>{{article.authorName || 'Alperler Rent A Car'}}</p><h1>{{article.title}}</h1><span>{{article.date}} · {{article.readTime}}</span></div>
              @if(article.media.length>1){<div class="nav"><button type="button" (click)="previous()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><b>{{currentMedia()+1}} / {{article.media.length}}</b><button type="button" (click)="next()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}
            </div>
          </section>
        }@else{
          <section class="title-hero"><div><p>{{article.authorName || 'Alperler Rent A Car'}}</p><h1>{{article.title}}</h1><span>{{article.date}} · {{article.readTime}}</span></div></section>
        }

        <article class="article">
          @if(article.summary){<p class="lead">{{article.summary}}</p>}
          <div class="prose" [innerHTML]="article.content"></div>
          <footer class="article-footer">
            <div><small>YAZAR</small><strong>{{article.authorName || 'Alperler Rent A Car'}}</strong></div>
            <div class="share"><button type="button" (click)="sharePost()"><mat-icon aria-hidden="true">share</mat-icon>Paylaş</button><button type="button" (click)="copyLink()"><mat-icon aria-hidden="true">link</mat-icon>Bağlantıyı Kopyala</button></div>
            @if(showCopyMsg()){<p class="copied" role="status">Bağlantı kopyalandı.</p>}
            <div class="bottom"><a routerLink="/blog"><mat-icon aria-hidden="true">arrow_back</mat-icon>Tüm Yazılar</a><button type="button" (click)="openContact()">Bize Ulaşın</button></div>
          </footer>
        </article>

        <app-detail-media-lightbox [open]="fullscreenOpen()" [items]="article.media" [index]="currentMedia()" [title]="article.title+' fotoğraf ve video galerisi'" (closed)="closeFullscreen()" (indexChange)="currentMedia.set($event)" />
      }@else if(loading()){
        <section class="state" role="status"><div class="spinner"></div><strong>Yazı yükleniyor</strong></section>
      }@else{
        <section class="state" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Yazı bulunamadı</strong><span>{{error()}}</span><a routerLink="/blog">Tüm Yazılara Dön</a></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#fff;color:#0f172a}.page{min-height:100vh;background:#fff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.96);backdrop-filter:blur(14px)}.bar{display:flex;width:min(100% - 24px,1180px);min-height:66px;margin:auto;align-items:center;gap:10px}.bar>button{display:grid;width:43px;height:43px;place-items:center;border:1px solid #e2e8f0;border-radius:13px;background:#fff;color:#0f172a}.bar p{margin:0;color:#2563eb;font-size:8px;font-weight:950;letter-spacing:.15em}.bar strong{display:block;max-width:76vw;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.gallery{background:#020617}.frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/9;overflow:hidden;background:#020617}.media-button{display:block;width:100%;height:100%;border:0;background:#020617;padding:0;cursor:zoom-in}.frame img,.frame video{display:block;width:100%;height:100%;object-fit:cover}.expand{position:absolute;z-index:4;top:13px;right:13px;display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(255,255,255,.25);border-radius:13px;background:rgba(2,6,23,.78);color:#fff}.shade{pointer-events:none;position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.9),rgba(2,6,23,.05) 64%)}.hero-copy{pointer-events:none;position:absolute;left:18px;right:18px;bottom:65px;color:#fff}.hero-copy p,.title-hero p{margin:0;color:#93c5fd;font-size:9px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.hero-copy h1{max-width:900px;margin:6px 0 0;font:900 clamp(25px,6vw,50px)/1.05 Georgia,serif}.hero-copy span{display:block;margin-top:8px;color:#cbd5e1;font-size:10px}.nav{position:absolute;right:14px;bottom:13px;display:flex;align-items:center;gap:6px}.nav button{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.25);border-radius:13px;background:rgba(2,6,23,.78);color:#fff}.nav b{border-radius:999px;background:rgba(2,6,23,.78);padding:8px 10px;color:#fff;font-size:9px}.title-hero{background:#07101f;color:#fff}.title-hero>div{width:min(100% - 32px,900px);margin:auto;padding:55px 0}.title-hero h1{margin:7px 0 0;font:900 clamp(30px,7vw,54px)/1.06 Georgia,serif}.title-hero span{display:block;margin-top:12px;color:#cbd5e1;font-size:11px}.article{width:min(100% - 32px,860px);margin:0 auto;padding:34px 0 70px}.lead{margin:0 0 28px;border-left:4px solid #2563eb;padding:2px 0 2px 16px;color:#334155;font-size:clamp(17px,3vw,21px);font-weight:650;line-height:1.65}.prose{color:#334155;font-size:16px;line-height:1.9}.prose :where(h1,h2,h3){margin-top:1.7em;color:#0f172a;font-family:Georgia,serif;line-height:1.2}.prose :where(img,video){max-width:100%;border-radius:16px}.prose :where(a){color:#1d4ed8;text-decoration:underline}.article-footer{display:grid;gap:16px;margin-top:46px;border-top:1px solid #e2e8f0;padding-top:22px}.article-footer small{display:block;color:#64748b;font-size:8px;font-weight:950}.article-footer strong{display:block;margin-top:3px}.share{display:flex;flex-wrap:wrap;gap:7px}.share button,.bottom a,.bottom button,.state a{display:flex;min-height:44px;align-items:center;justify-content:center;gap:6px;border:0;border-radius:11px;background:#0f172a;padding:0 14px;color:#fff;font-size:10px;font-weight:900;text-decoration:none}.share button:last-child{background:#eff6ff;color:#1d4ed8}.copied{margin:0;color:#15803d;font-size:10px;font-weight:850}.bottom{display:flex;align-items:center;justify-content:space-between;gap:8px}.bottom a{background:#f1f5f9;color:#334155}.bottom button{background:#2563eb}.state{display:grid;min-height:70vh;place-items:center;align-content:center;gap:10px;padding:24px;text-align:center;color:#64748b}.state strong{color:#0f172a}.spinner{width:32px;height:32px;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:640px){.frame{aspect-ratio:4/5}.hero-copy{bottom:66px}.nav{left:14px;right:14px;justify-content:flex-end}.article{padding-top:28px}.bottom{align-items:stretch;flex-direction:column}.bottom a,.bottom button{width:100%}}button:focus-visible,a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
  `],
})
export class BlogDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  readonly uiService = inject(UiService);
  readonly post = signal<BlogDetailPost | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly showCopyMsg = signal(false);
  readonly currentMedia = signal(0);
  readonly fullscreenOpen = signal(false);
  readonly activeMedia = computed(() => {
    const list = this.post()?.media || [];
    return list.length ? list[Math.min(this.currentMedia(), list.length - 1)] : null;
  });
  private requestSequence = 0;
  private touchX = 0;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = String(params["id"] || "").trim();
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
      void this.loadPost(id);
    });
  }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigateByUrl("/blog");
  }

  previous(): void {
    const length = this.post()?.media.length || 0;
    if (length > 1) this.currentMedia.update((index) => (index - 1 + length) % length);
  }
  next(): void {
    const length = this.post()?.media.length || 0;
    if (length > 1) this.currentMedia.update((index) => (index + 1) % length);
  }
  openFullscreen(): void { if (this.activeMedia()) this.fullscreenOpen.set(true); }
  closeFullscreen(): void { this.fullscreenOpen.set(false); }
  touchStart(event: TouchEvent): void { this.touchX = event.changedTouches[0]?.clientX || 0; }
  touchEnd(event: TouchEvent): void {
    const end = event.changedTouches[0]?.clientX || 0;
    const delta = end - this.touchX;
    if (Math.abs(delta) < 45) return;
    delta < 0 ? this.next() : this.previous();
  }

  openContact(): void { void this.router.navigate(["/contact"]); }
  sharePost(): void {
    const title = this.post()?.title || "Alperler Rent A Car Rehber";
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title, text: this.post()?.summary || "Alperler Rent A Car rehberinde bu yazıyı inceleyin.", url }).catch(() => undefined);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "_blank", "noopener,noreferrer");
  }
  copyLink(): void {
    if (!navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      this.showCopyMsg.set(true);
      setTimeout(() => this.showCopyMsg.set(false), 2000);
    });
  }

  private async loadPost(id: string): Promise<void> {
    const sequence = ++this.requestSequence;
    this.loading.set(true);
    this.error.set("");
    this.post.set(null);
    this.currentMedia.set(0);
    this.fullscreenOpen.set(false);
    try {
      const post = await this.detailData.loadBlog(id);
      if (sequence !== this.requestSequence) return;
      this.post.set(post);
    } catch (error) {
      if (sequence !== this.requestSequence) return;
      this.error.set(error instanceof Error ? error.message : "Blog yazısı yüklenemedi.");
    } finally {
      if (sequence === this.requestSequence) this.loading.set(false);
    }
  }
}

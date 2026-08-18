
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { AdminMediaService } from '../../services/admin-media.service';

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg></button>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Blog Yönetimi</h1>
          </div>
          <div class="grid w-full gap-2 sm:grid-cols-[minmax(220px,1fr)_auto] lg:w-auto">
            <input [(ngModel)]="searchQuery" type="search" autocomplete="off" placeholder="Blog başlığı veya içerik ara…" aria-label="Blog yazılarında ara" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500" />
            <button (click)="toggleForm()" class="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow hover:bg-blue-700">+ Yeni Yazı Ekle</button>
          </div>
        </div>
    </div>

    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">

    @if (showForm()) {
        <div class="fixed inset-0 bg-white overflow-y-auto w-full h-full min-h-[100dvh] animate-in fade-in duration-300" style="z-index: 99999;">
           <div class="max-w-5xl mx-auto w-full min-h-screen flex flex-col bg-white">
             <!-- Header -->
             <div class="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-20">
                <div class="flex items-center gap-4">
                    <button (click)="toggleForm()" class="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 p-2 md:px-5 md:py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        <span class="hidden md:inline">İptal Edip Geri Dön</span>
                    </button>
                    <h3 class="font-bold text-2xl text-slate-900 tracking-tight">
                        {{ newPost.id ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı' }}
                    </h3>
                </div>
             </div>

             <!-- Form Content -->
             <div class="p-6 md:p-8">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <!-- Main Content Left -->
                     <div class="space-y-6">
                         <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Başlık</label>
                            <input [(ngModel)]="newPost.title" placeholder="Blog yazısının çarpıcı başlığı" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                         </div>
                         
                         <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Kısa Özet (Meta Description)</label>
                            <textarea [(ngModel)]="newPost.summary" rows="3" placeholder="Yazının kısa, merak uyandıran özeti. Arama motorlarında da bu görünür." class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"></textarea>
                         </div>
                         
                         <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Yazı İçeriği (HTML Kullanabilirsiniz)</label>
                            <textarea [(ngModel)]="newPost.content" rows="12" placeholder="<p>Blog içeriğiniz...</p>" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"></textarea>
                         </div>
                     </div>
                     
                     <!-- Sidebar Config Right -->
                     <div class="space-y-6">
                         <div class="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h4 class="font-bold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">Görsel & Medya</h4>
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Kapak Görseli URL</label>
                             <input [(ngModel)]="newPost.image" placeholder="https://..." aria-label="Blog kapak görseli URL adresi" class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none mb-2">
                             <label class="mb-4 flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700">Dosya Seç
                               <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="onBlogImageSelected($event)" aria-label="Blog kapak görseli dosyası seç" />
                             </label>
                             
                             <!-- Preview -->
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Önizleme</label>
                             <div class="w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-200 relative">
                                 @if(newPost.image) {
                                     <img [src]="newPost.image" class="w-full h-full object-cover">
                                 } @else {
                                     <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                         <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                         <span class="text-xs font-medium">Görsel Yok</span>
                                     </div>
                                 }
                             </div>
                         </div>
                         
                         <div class="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h4 class="font-bold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">Yayın Ayarları</h4>
                             
                             <div class="space-y-4">
                                 <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Yayın Tarihi</label>
                                    <input [(ngModel)]="newPost.date" placeholder="Örn: 15 Mayıs 2024" class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                                 </div>
                                 <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Okuma Süresi</label>
                                    <input [(ngModel)]="newPost.readTime" placeholder="Örn: 4 dk" class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
             
             <!-- Footer Actions -->
             <div class="bg-white/95 backdrop-blur-md px-6 py-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 z-20">
                 <button (click)="toggleForm()" class="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Vazgeç</button>
                 <button (click)="addPost()" class="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2">
                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                     {{ newPost.id ? 'Değişiklikleri Kaydet' : 'Yazıyı Yayınla' }}
                 </button>
             </div>
           </div>
        </div>
    } @else {

    <!-- List View -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
        @for (post of filteredPosts(); track post.id) {
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md hover:border-blue-300 transition-all">
                <div class="aspect-[16/9] relative overflow-hidden bg-slate-100">
                    <img [src]="post.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="absolute top-3 right-3 flex gap-2">
                         <button (click)="editPost(post)" class="p-2 bg-white/90 text-blue-600 rounded-full hover:bg-white shadow backdrop-blur-sm transition-all transform opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0" title="Düzenle">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                         </button>
                         <button (click)="deletePost(post.id)" class="p-2 bg-white/90 text-red-600 rounded-full hover:bg-red-50 shadow backdrop-blur-sm transition-all transform opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 delay-75" title="Sil">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                         </button>
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-1">
                    <h3 class="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{{ post.title }}</h3>
                    <p class="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">{{ post.summary }}</p>
                    <div class="flex items-center justify-between text-xs font-semibold text-slate-400 pt-4 border-t border-slate-100">
                        <span class="flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            {{ post.date }}
                        </span>
                        <span class="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {{ post.readTime }}
                        </span>
                    </div>
                </div>
            </div>
        }
    </div>
    }
    </div>
  `
})
export class AdminBlogComponent {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  mediaService = inject(AdminMediaService);
  router = inject(Router);
  posts = this.carService.getBlogPosts();
  showForm = signal(false);
  searchQuery = "";

  newPost: any = {
      title: '', summary: '', content: '', image: '', readTime: '', date: new Date().toLocaleDateString('tr-TR')
  };

  filteredPosts() {
      const q = this.searchQuery.trim().toLocaleLowerCase('tr-TR');
      if (!q) return this.posts();
      return this.posts().filter((post) => `${post.title} ${post.summary} ${post.content}`.toLocaleLowerCase('tr-TR').includes(q));
  }

  async onBlogImageSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
          const entityId = String(this.newPost.cloudId || this.newPost.id || `draft-${Date.now()}`);
          const uploaded = await this.mediaService.uploadImage(file, 'BLOG', entityId, 'cover');
          this.newPost.image = uploaded.publicUrl;
          this.toastService.show("Blog görseli yüklendi.", 'success');
      } catch (error) {
          this.toastService.show(error instanceof Error ? error.message : 'Blog görseli yüklenemedi.', 'error');
      } finally { input.value = ''; }
  }

  goBack() {
      this.router.navigate(['/admin/dashboard']);
  }

  toggleForm() { 
      this.showForm.update(v => !v); 
      if (!this.showForm()) {
          this.newPost = { title: '', summary: '', content: '', image: '', readTime: '', date: new Date().toLocaleDateString('tr-TR') };
      }
  }

  editPost(post: any) {
      this.newPost = { ...post };
      this.showForm.set(true);
  }

  addPost() {
      if (!this.newPost.title || !this.newPost.content) {
          this.toastService.show('Lütfen başlık ve içerik alanlarını doldurun.', 'error');
          return;
      }
      this.carService.addBlogPost(this.newPost);
      this.toastService.show(this.newPost.id ? 'Yazı güncellendi.' : 'Yeni yazı eklendi.', 'success');
      this.showForm.set(false);
      // Reset
      this.newPost = { title: '', summary: '', content: '', image: '', readTime: '', date: new Date().toLocaleDateString('tr-TR') };
  }

  async deletePost(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Yazıyı Sil',
          message: 'Bu yazıyı silmek istediğinize emin misiniz?'
      });
      if(confirmed) {
          this.carService.deleteBlogPost(id);
          this.toastService.show('Yazı silindi.', 'info');
      }
  }
}

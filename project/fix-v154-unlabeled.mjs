import fs from 'node:fs';

function patch(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Target not found in ${path}: ${from.slice(0,120)}`);
  fs.writeFileSync(path, source.replace(from, to));
}

const blog = 'src/pages/admin/admin-blog.component.ts';
patch(blog,
  '<input [(ngModel)]="newPost.title" placeholder="Blog yazısının çarpıcı başlığı"',
  '<input [(ngModel)]="newPost.title" aria-label="Blog yazısı başlığı" placeholder="Blog yazısının çarpıcı başlığı"');
patch(blog,
  '<textarea [(ngModel)]="newPost.summary" rows="3" placeholder="Yazının kısa, merak uyandıran özeti. Arama motorlarında da bu görünür."',
  '<textarea [(ngModel)]="newPost.summary" rows="3" aria-label="Blog yazısı kısa özeti" placeholder="Yazının kısa, merak uyandıran özeti. Arama motorlarında da bu görünür."');
patch(blog,
  '<textarea [(ngModel)]="newPost.content" rows="12" placeholder="<p>Blog içeriğiniz...</p>"',
  '<textarea [(ngModel)]="newPost.content" rows="12" aria-label="Blog yazısı içeriği" placeholder="<p>Blog içeriğiniz...</p>"');
patch(blog,
  '<input [(ngModel)]="newPost.date" placeholder="Örn: 15 Mayıs 2024"',
  '<input [(ngModel)]="newPost.date" aria-label="Blog yayın tarihi" placeholder="Örn: 15 Mayıs 2024"');
patch(blog,
  '<input [(ngModel)]="newPost.readTime" placeholder="Örn: 4 dk"',
  '<input [(ngModel)]="newPost.readTime" aria-label="Blog okuma süresi" placeholder="Örn: 4 dk"');

patch('src/pages/admin/admin-customer-detail.component.ts',
  '<input [(ngModel)]="rejectReason" name="rejectReason" placeholder="Örn. Görüntü net değil, lütfen yeniden yükleyin." />',
  '<input [(ngModel)]="rejectReason" name="rejectReason" aria-label="Belgeyi yeniden yükleme nedeni" placeholder="Örn. Görüntü net değil, lütfen yeniden yükleyin." />');

const team = 'src/pages/admin/admin-team.component.ts';
patch(team,
  '<select [(ngModel)]="admin.role" (change)="saveAdmin(admin)" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold">',
  '<select [(ngModel)]="admin.role" (change)="saveAdmin(admin)" [attr.aria-label]="(admin.displayName || admin.email) + \' yönetici rolünü seç\'" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold">');
patch(team,
  '<select [(ngModel)]="admin.primaryBranchId" (change)="saveAdmin(admin)" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm">',
  '<select [(ngModel)]="admin.primaryBranchId" (change)="saveAdmin(admin)" [attr.aria-label]="(admin.displayName || admin.email) + \' ana şubesini seç\'" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm">');

console.log('Remaining unlabeled admin controls fixed.');

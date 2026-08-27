import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message || `Missing required contract: ${needle}`);
};
const mustNot = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message || `Forbidden legacy contract present: ${needle}`);
};

const routes = read('src/app.routes.ts');
const hub = read('src/pages/admin/admin-content-hub.component.ts');
const workspace = read('src/pages/admin/admin-catalog-workspace.component.ts');
const blog = read('src/pages/admin/admin-blog.component.ts');
const blogService = read('src/services/blog-admin.service.ts');
const catalogMedia = read('src/services/catalog-media.service.ts');
const campaigns = read('src/pages/admin/admin-campaigns-v167.component.ts');
const publicMedia = read('src/services/public-catalog-media.service.ts');
const publicDetail = read('src/services/public-detail-data.service.ts');
const blogDetail = read('src/pages/blog-detail.component.ts');
const campaignInvariant = read('supabase/migrations/20260827193000_v198_campaign_publication_activation_invariant.sql');

for (const contract of [
  "{ path: 'catalog-editor', redirectTo: 'cars', pathMatch: 'full' }",
  "{ path: 'media', redirectTo: 'cars', pathMatch: 'full' }",
  "data: { contentSection: 'rental' }",
  "data: { contentSection: 'sale' }",
  "data: { contentSection: 'tour' }",
  "data: { contentSection: 'campaigns' }",
  "data: { contentSection: 'blog' }",
  "data: { contentSection: 'benefits' }",
]) must(routes, contract, `Admin route ownership contract missing: ${contract}`);

for (const contract of [
  'mode="RENTAL"',
  'mode="SALE"',
  'mode="TOUR"',
  "benefits:'/admin/benefits'",
]) must(hub, contract, `Admin content hub must enforce separate entity workspace contract: ${contract}`);
for (const legacy of ['AdminCatalogEditorComponent','AdminSaleIntegrityV1681Component','AdminTourStudioV170Component']) {
  mustNot(hub, legacy, `Admin content hub must not render legacy parallel editor ${legacy}`);
}

for (const contract of [
  'Fotoğraf & Video',
  '+ {{ newButtonLabel() }}',
  'type="search"',
  'CatalogMediaService',
  "upload(type,id,file",
  "createVehicle(this.mode)",
  'createTour()',
  'hourlyRentalEnabled',
  'minimumRentalHours',
  'damageExpertise',
  'tramerStatus',
  'itinerary=splitLines',
  'includedItems',
  'excludedItems',
  'latitude',
  'longitude',
  "saveVehicleAs('PUBLISHED')",
  "saveTourAs('PUBLISHED')",
]) must(workspace, contract, `Catalog workspace missing customer/admin contract: ${contract}`);
for (const legacyField of ['<span>Kapak URL</span>','<span>Medya URL</span>','[(ngModel)]="externalUrl"']) mustNot(workspace, legacyField, `Catalog workspace must not expose common/external media URL field: ${legacyField}`);

for (const contract of [
  'BlogAdminService',
  'CatalogMediaService',
  '+ Yeni Blog Yazısı',
  'createDraft()',
  "upload('BLOG',post.id",
  'authorName',
  'seoTitle',
  'seoDescription',
  "saveAs('PUBLISHED')",
  'Fotoğraf & Video',
]) must(blog, contract, `Blog editor missing owned workflow contract: ${contract}`);
mustNot(blog, '<span>Kapak Görseli URL</span>', 'Blog editor must not expose legacy cover URL field.');
for (const contract of ['status: "DRAFT"','author_name','seo_title','seo_description','PATCH','removeAll("BLOG", record.id)','status=eq.DRAFT','fetchById(record.id)']) must(blogService, contract, `Canonical blog admin persistence/lifecycle missing: ${contract}`);
for (const contract of ['async removeAll(','deleteStorageObjectWithRetry','CATALOG_MEDIA_OWNER_CLEANUP_INCOMPLETE','for (const delay of [0, 400, 1200, 3000])']) must(catalogMedia, contract, `Owned catalog media cleanup contract missing: ${contract}`);
mustNot(catalogMedia, 'Catalog media metadata removed but Storage cleanup failed', 'Storage cleanup failures must not be swallowed after metadata deletion.');

for (const contract of [
  '+ Yeni Kampanya',
  "title: 'Yeni Kampanya'",
  "uploadImage(file, 'CAMPAIGN', campaignId, 'cover')",
  'this.persist(previousStatus, false, true, previousStep)',
  'discountMethod',
  'discountScope',
  'visibilityMode',
  'targetType',
  'targetId',
  'maxRedemptions',
  'perCustomerLimit',
  "saveAs('PUBLISHED')",
]) must(campaigns, contract, `Campaign editor missing owned workflow contract: ${contract}`);
mustNot(campaigns, '<span>Kapak URL</span>', 'Campaign editor must not expose legacy cover URL field.');
mustNot(campaigns, "await this.saveAs('DRAFT',false)", 'Campaign media upload must preserve the existing publication status.');
for (const contract of [
  'normalize_campaign_publication_activation_v198',
  "publication_status = 'PUBLISHED'",
  'new.is_active := true',
  "publication_status = 'ARCHIVED'",
  'new.is_active := false',
  'campaigns_publication_activation_v198_check',
  'validate constraint campaigns_publication_activation_v198_check',
]) must(campaignInvariant, contract, `Campaign publication DB invariant missing: ${contract}`);

for (const contract of ['blogPostId?: string','blog_post_id','loadForBlog']) must(publicMedia, contract, `Public media service missing blog owner scope: ${contract}`);
for (const contract of ['BlogDetailPost','author_name','seo_title','seo_description','loadForBlog(ownerId)','media: BlogDetailMediaItem[]']) must(publicDetail, contract, `Public blog hydration missing contract: ${contract}`);
for (const contract of ['fullscreenOpen','touchStart','touchEnd','article.media.length','authorName']) must(blogDetail, contract, `Public blog detail media contract missing: ${contract}`);

console.log('V198 admin content ownership contract: PASS');

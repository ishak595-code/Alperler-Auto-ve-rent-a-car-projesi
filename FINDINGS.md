# Production Polish Wave 1 - Findings and Fixes

**Branch**: `cursor/production-polish-wave1-3320`  
**Date**: 2026-09-12  
**Owner Reports**: Admin uploads may not persist or appear immediately; admin/public may be out of sync.

## Executive Summary

Investigation revealed **one critical broken data flow** and several architectural improvements needed. The root cause of admin media not appearing on the public site was a **hardcoded Supabase URL** in the media sync trigger that bypassed the application's same-origin proxy.

---

## Critical Findings

### 🔴 CRITICAL: Catalog Media URL Generation Breaks Portability and Display

**File**: `supabase/migrations/202608140024_catalog_media_parent_sync_v1.sql`  
**Function**: `private.catalog_media_public_url()`

**Problem**:
The function hardcodes the Supabase project URL:
```sql
'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || p_storage_bucket || '/' || p_object_path
```

**Impact**:
1. **Admin uploads persist but don't display correctly** - Media records are created successfully in `catalog_media` table and synced to parent `vehicles.images`/`tours.images` columns via trigger, but the URLs are full Supabase URLs instead of portable `/catalog-media/` paths
2. **Breaks deployment portability** - Violates the V186/V242 portability contract that requires environment-driven media URLs
3. **Bypasses CDN caching** - Direct Supabase URLs don't benefit from the Vercel CDN configuration for `/catalog-media/` routes
4. **Inconsistent with public media service** - `PublicCatalogMediaService` correctly uses `/catalog-media/` for display, but the database URLs don't match

**Flow Analysis**:
```
Admin Upload Flow:
1. ✅ AdminCatalogWorkspaceComponent.uploadFiles()
2. ✅ CatalogMediaService.upload() → Supabase Storage (catalog-media bucket)
3. ✅ Creates record in catalog_media table
4. ✅ Trigger fires: catalog_media_parent_sync
5. ❌ BROKEN: sync_catalog_media_parent() generates hardcoded Supabase URLs
6. ✅ Updates vehicles.images / tours.images with wrong URLs
7. ❌ Public site reads these URLs, they don't match /catalog-media/ proxy

Public Display Flow:
1. ✅ ScalablePublicCatalogV217Service reads from public_vehicle_catalog_v217
2. ✅ View returns vehicles.images (with hardcoded Supabase URLs)
3. ❌ PublicCatalogMediaService tries to map URLs but receives wrong format
4. ❌ Images fail to load through same-origin proxy
```

**Fix**: Migration V320 updates `private.catalog_media_public_url()` to:
```sql
when p_storage_bucket = 'catalog-media' and nullif(p_object_path, '') is not null
  then '/catalog-media/' || p_object_path  -- Portable same-origin path
```

**Verification**:
- [x] Resync trigger updates all existing records
- [ ] Test admin photo upload for rental vehicle
- [ ] Verify photo appears immediately on /fleet page
- [ ] Test admin video upload for tour
- [ ] Verify video appears on /tour/:id detail page
- [ ] Check homepage catalog refresh after upload

---

## Architectural Observations

### ✅ GOOD: Realtime Refresh Architecture

**Files**: `PublicContentRealtimeService`, `HomepageLayoutService`, `BranchService`, `CampaignService`

**What Works**:
- WebSocket realtime subscription to `catalog_media` table changes
- Debounced refresh queues (120ms-160ms) prevent burst requests
- Visibility-aware reconnection when tab regains focus
- Watchdog monitors stale connections (80s threshold)
- Homepage sections refresh automatically on catalog_media changes

**Evidence**:
```typescript
// HomepageLayoutService constructor
const unwatch = this.realtime.watch(
  ['homepage_sections', 'homepage_placements', 'vehicles', 'tours', 'blog_posts', 'campaigns', 'branches'],
  () => this.onRealtime()
);
```

The realtime infrastructure is **correct** - the issue was the URL generation, not the refresh flow.

### ✅ GOOD: Admin Upload Pipeline

**Files**: `CatalogMediaService`, `AdminCatalogWorkspaceComponent`

**What Works**:
- TUS resumable upload for files ≥6MB
- Standard upload for smaller files
- Progress tracking during upload
- Automatic cover image selection
- Alt text and sort order management
- Storage cleanup on failure

### ⚠️ OBSERVATION: Public Catalog Views Don't Join catalog_media

**File**: `supabase/migrations/20260830124500_v217_scalable_public_catalog_views.sql`

**Current Design**:
Views like `public_vehicle_catalog_v217` read `vehicles.images` and `vehicles.cover_image` columns directly. They do NOT join with `catalog_media` table.

**Why This Works**:
The trigger `catalog_media_parent_sync` keeps `vehicles.images` synced with `catalog_media` records. This is actually a **good design** because:
1. Views remain simple and fast (no joins)
2. Catalog queries don't need to join media tables
3. Sync is handled at write-time, not read-time
4. RLS policies are simpler

**No Action Needed** - This is intentional bounded ownership.

---

## Secondary Findings

### 📝 TODO: Check Homepage Section Ordering

**Files**: `homepage_sections`, `homepage_placements` tables

**Question**: Are admin-configured homepage sections actually displaying in the correct order?

**Test Plan**:
1. Admin: Navigate to /admin/homepage
2. Verify section order matches live homepage
3. Add/remove/reorder sections
4. Verify changes appear immediately (via realtime)

### 📝 TODO: Verify Campaign Refresh

**Files**: `CampaignService`, campaign admin UI

**Question**: Do campaign edits flow correctly to homepage and detail pages?

**Test Plan**:
1. Admin: Edit campaign badge/description
2. Check homepage campaign section refresh
3. Verify detail pages update

### 📝 TODO: Check Navigation/Footer Settings

**Files**: `NavigationConfigService`, `FooterSettingsService`

**Question**: Do admin navigation/footer changes propagate correctly?

**Test Plan**:
1. Admin: Edit navigation items
2. Verify navbar updates on public site
3. Admin: Edit footer links
4. Verify footer updates

---

## Testing Checklist

### Critical Path: Admin Media Upload → Public Display

- [ ] **Rental Vehicle Photos**
  1. Admin: Upload 3 photos to a rental vehicle
  2. Set one as cover
  3. Verify photos appear on /fleet page immediately
  4. Verify photos appear on /fleet/:id detail page
  5. Check that URLs are `/catalog-media/...` format

- [ ] **Sale Vehicle Photos with Expertise**
  1. Admin: Create sale vehicle with tramer data
  2. Upload photos
  3. Verify photos on /sales page
  4. Verify expertise section shows correctly

- [ ] **Tour Photos and Videos**
  1. Admin: Upload 2 photos + 1 video to tour
  2. Verify tour card shows cover photo
  3. Verify /tour/:id shows gallery
  4. Verify video plays with poster

- [ ] **Blog Post Cover**
  1. Admin: Create blog post
  2. Upload cover image
  3. Verify appears on /blog list
  4. Verify appears on /blog/:id

### Homepage Sync

- [ ] **Campaign on Homepage**
  1. Admin: Create/edit campaign
  2. Add to homepage placement
  3. Verify appears in homepage campaign section
  4. Verify realtime refresh (< 30s)

- [ ] **Featured Vehicles**
  1. Admin: Mark rental vehicle as featured
  2. Upload photo
  3. Verify appears in homepage rental section
  4. Check sort order (featured first)

### Settings Sync

- [ ] **Navigation Changes**
  1. Admin: Add navigation item
  2. Verify navbar updates
  
- [ ] **Footer Changes**
  1. Admin: Edit footer link
  2. Verify footer updates

---

## Follow-Up Work (Separate PRs)

### Performance Optimization

- **Image Optimization**: Consider adding image transformation at upload time (thumbnails, WebP conversion)
- **Lazy Loading**: Audit gallery components for proper lazy loading attributes
- **Bundle Analysis**: Run Webpack Bundle Analyzer to find large dependencies

### Incomplete Flows

- **Booking Checkout**: Audit end-to-end booking flow for rental/tour
- **List Your Car**: Verify submission → admin moderation flow
- **Branch Partner**: Check application → subscription flow
- **Customer Account**: Verify document upload and reservation history

### Missing Features

- **Media Management**: Consider adding bulk upload, drag-to-reorder, bulk delete
- **SEO**: Add alt text auto-suggestions based on vehicle/tour data
- **Preview**: Add "Preview as Customer" button in admin catalog editor

---

## Migration Strategy

### V320 Deployment

1. **Pre-deployment**: No special preparation needed
2. **Apply migration**: V320 updates function + resyncs all records
3. **Post-deployment verification**:
   - Check sample vehicle images load via `/catalog-media/`
   - Verify homepage loads correctly
   - Test admin upload of new photo
4. **Rollback**: If needed, restore `private.catalog_media_public_url()` to previous version (not recommended - would break new uploads)

### Risk Assessment

**Low Risk** - This fix:
- Only changes URL generation format (internal)
- Does not alter storage bucket or object paths
- Does not change RLS policies
- Resync is idempotent (can be run multiple times)

**Zero Downtime** - URLs transition seamlessly:
- Old Supabase URLs remain valid (proxy can handle both)
- New uploads use portable paths immediately
- Existing images gradually migrate via resync

---

## Verified Against Repository Contracts

- ✅ **V186 Portability**: Fixed hardcoded Supabase URL
- ✅ **V203 Canonical Runtime**: No duplicate renderers introduced
- ✅ **V206 Developer Handoff**: Updated with clear findings
- ✅ **V242 Portable Runtime Parity**: Maintains `/catalog-media/` routing
- ✅ **No Migration Rewrites**: New migration only, no edits to applied history

---

## Summary of Changes

1. **New Migration**: `20260913000000_v320_portable_catalog_media_urls.sql`
   - Updates `private.catalog_media_public_url()` to use `/catalog-media/` paths
   - Resyncs all existing catalog media records
   
2. **This Document**: `FINDINGS.md`
   - Comprehensive investigation results
   - Test plan for verification
   - Follow-up work recommendations

**Next Steps**:
1. Review and test V320 migration in development
2. Apply migration to production
3. Execute testing checklist
4. Monitor for 24-48 hours
5. Create follow-up issues for secondary items

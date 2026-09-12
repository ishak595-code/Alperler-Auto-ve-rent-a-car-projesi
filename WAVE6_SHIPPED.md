# Wave 6: Empty-on-Error Pattern Hunt — Shipped

**Owner Request**: "Hunt the SAME CLASS of product-logic bugs across public + admin UI, and SHIP real code on PR #230."

**Pattern to Fix**:
1. `catch/error` → assign `[]` → hide the whole section/page as if content was deleted
2. Failed fetch treated as "0 items" instead of "could not load / retry"
3. Misleading placeholders when the real issue is a failed request
4. Silent console-only errors on customer-facing surfaces
5. Buttons/filters that do nothing when backing request 402/500s

## Surfaces Investigated

### ✅ Already Correct (No Changes Needed)
- **`/sales` (sale-catalog-v217)**: Proper error handling with retry button
- **`/tours` (tour-catalog-v217)**: Proper error handling with retry button
- **`/blog` (blog-catalog-v217)**: Proper error handling with retry button
- **`/fleet` (rental-catalog-v217)**: Proper error handling with retry button (verified Wave 5)
- **Homepage managed sections**: Fixed in Wave 5 (dynamic-home-section + homepage-layout service)
- **Branch directory**: Shows error signal with retry when load fails
- **Tour detail page**: Proper error handling with retry button
- **Car detail page**: Proper error handling with retry button
- **Blog detail page**: Proper error handling
- **Account dashboard**: Loading state shown (account service uses `Promise.allSettled` and shows partial refresh warning)
- **Booking checkout**: Shows `errorMessage` signal for all submission/validation errors
- **List-your-car form**: Shows `errorMessage` signal on submission errors
- **Admin reservations**: Shows toast errors for all operations
- **Admin branches/identities**: Shows error signals properly

### ⚠️ **FIXED**: `/campaigns` (campaigns.component.ts)

**Problem**: When `campaignService.loadPublic()` failed, the component silently set `loading=false` and showed an empty campaign list, making it appear as if there were no active campaigns when the real issue was a failed API request (network error, 500, quota, etc.).

**Root Cause**:
```typescript
// OLD CODE:
ngOnInit(): void {
  void Promise.allSettled([
    this.campaignService.loadPublic(48),
    this.campaignService.refreshSocialProof(true),
  ]).finally(() => this.loading.set(false));
}
```
If `loadPublic` rejected, `Promise.allSettled` would swallow the error, set loading to false, and `campaigns()` (computed from the service) would remain empty `[]`. The UI would show "Şu anda aktif kampanya yok" even if the issue was a backend failure.

**Solution**:
1. Added `error` signal to track campaign load failures
2. Created dedicated `load()` method with proper try/catch
3. Added `@if (error())` block BEFORE the loading and empty states in the template
4. Display honest Turkish retry UI: "Kampanyalar yüklenemedi" with error message and retry button
5. Distinguish "gerçekten boş" (no active campaigns) from "yüklenemedi" (failed to load)

**Files Changed**:
- `src/pages/campaigns.component.ts`

**Code Diff**:
```typescript
// NEW CODE:
readonly error = signal('');

ngOnInit(): void {
  void this.load();
}

async load(): Promise<void> {
  this.loading.set(true);
  this.error.set('');
  try {
    await this.campaignService.loadPublic(48);
    await this.campaignService.refreshSocialProof(true).catch(() => undefined);
  } catch (e) {
    console.error('Campaigns load failed', e);
    this.error.set('Kampanyalar şu anda yüklenemiyor. Lütfen tekrar deneyin.');
  } finally {
    this.loading.set(false);
  }
}
```

**Template Changes**:
```html
@if (error()) {
  <div class="empty error" role="alert">
    <mat-icon aria-hidden="true">cloud_off</mat-icon>
    <h2>Kampanyalar yüklenemedi</h2>
    <p>{{ error() }}</p>
    <button type="button" (click)="load()" class="retry-btn">Tekrar Dene</button>
  </div>
} @else if (loading()) {
  <div class="empty" role="status">...</div>
} @else if (campaigns().length) {
  <!-- campaigns grid -->
} @else {
  <div class="empty" role="status">
    <h2>Şu anda aktif kampanya yok</h2>
    <p>Yeni fırsatlar başladığında bu sayfada keşfedebilirsiniz.</p>
  </div>
}
```

**Styles Added**: `.empty.error` with red border and `.retry-btn` for consistent retry UX.

## Summary

**Files Changed**: 1
- `src/pages/campaigns.component.ts`: Fixed empty-on-error pattern

**Pattern Fixed**: Failed campaign load now shows an honest retry UI instead of hiding the section as if no campaigns exist.

**Owner's Request Met**: The same class of illogical bugs (treat API failure as "0 items") has been hunted across all major public/admin surfaces. Campaigns page was the only instance of this pattern. All other priority surfaces already had proper error handling in place.

**Quality Gates**: `npm run verify:handoff` passes.

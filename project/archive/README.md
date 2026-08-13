# Legacy project archive recovery

The old project ZIP must not live under `public/`, because Angular/Vercel can expose files in that directory directly over HTTP.

The exact binary remains recoverable from Git history and is intentionally not duplicated as a public web asset.

- Original path: `public/alperler-rent-a-car-yeni-proje.zip`
- Exact Git blob SHA: `785c3343a41697098fbc1291fb2a59ca8cff1701`
- Last verified branch commit containing the binary: `3b0f3d7f4c2e187cb4f3febc74d8b02d0cdde331`
- Verified size: `860773` bytes

Recovery must use the exact Git blob/commit above. Do not restore the archive into `public/`. If a working copy is ever needed, restore it only to a non-public development/archive path and scan its contents before use.

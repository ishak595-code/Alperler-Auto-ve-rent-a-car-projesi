# V186 Security Scope Notes

V186 closes repository-controlled portability drift and remaining central admin browser bypasses for Analytics and Newsletter. It does not assert that account-level controls are automatically configured.

Repository-controlled guarantees:

- production Edge slugs have committed source and a deployment manifest;
- legacy owner bootstrap behavior is retired and cannot be restored from current source;
- Analytics admin uses same-origin BFF -> JWT-protected Edge -> explicit actor service RPC;
- Newsletter public subscription uses same-origin BFF -> public Edge with server-added client headers;
- Newsletter admin reads use same-origin BFF -> JWT-protected Edge -> explicit actor service RPC;
- Newsletter admin sends/updates use same-origin BFF -> existing JWT-protected admin Edge;
- old browser Analytics RPC and Newsletter table access is removed only in V186.1 after replacement verification;
- dead production domain references are blocked by CI;
- browser service-role credential markers are blocked by CI.

Account/platform controls to verify separately before or immediately after launch:

- repository visibility and enforced GitHub branch/ruleset protection;
- Supabase leaked-password protection, MFA and session policy;
- hosting WAF/bot management where supported;
- DNS/TLS and Supabase Auth Site URL/redirect URLs for the final hostname;
- external backups and restore testing.

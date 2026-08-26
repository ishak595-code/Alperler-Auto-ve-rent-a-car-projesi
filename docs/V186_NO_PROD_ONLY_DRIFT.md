# No production-only drift

Any production database DDL/RLS/RPC change or Edge Function change must have an equivalent committed source before V186 is considered launch-ready. Dashboard-only emergency changes must be backported immediately before the next deployment.

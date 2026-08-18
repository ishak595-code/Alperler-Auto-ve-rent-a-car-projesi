-- Restore authenticated execution rights required by admin RLS policies.
-- RLS still decides whether the signed-in user may read/manage each row.
grant execute on function private.can_manage_operations() to authenticated;
grant execute on function private.can_view_finance() to authenticated;

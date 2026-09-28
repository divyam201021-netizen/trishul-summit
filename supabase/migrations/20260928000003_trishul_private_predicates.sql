-- ============================================================================
-- RLS predicates move out of the API-exposed schema
-- ============================================================================
-- `trishul_is_staff()` and `trishul_owns_registration()` must be SECURITY
-- DEFINER (otherwise a policy calling them would recurse through RLS), and they
-- must be EXECUTE-able by `authenticated` (because policy expressions are
-- evaluated as the calling role). That combination makes Supabase's linter
-- report them as reachable over `/rest/v1/rpc`.
--
-- Moving them to a schema that PostgREST does not expose removes the reachable
-- surface without weakening anything: policy expressions reference the function
-- by object id, so they keep resolving after the move, and `authenticated`
-- still holds EXECUTE for policy evaluation.
-- ============================================================================

create schema if not exists private;

alter function public.trishul_is_staff() set schema private;
alter function public.trishul_owns_registration(uuid) set schema private;

-- The API roles need to reach the schema to evaluate policies, but the schema
-- itself is not part of PostgREST's exposed set, so no RPC endpoint is created.
grant usage on schema private to authenticated;
grant usage on schema private to service_role;
grant execute on function private.trishul_is_staff() to authenticated, service_role;
grant execute on function private.trishul_owns_registration(uuid) to authenticated, service_role;

revoke all on function private.trishul_is_staff() from anon;
revoke all on function private.trishul_owns_registration(uuid) from anon;

comment on schema private is 'Internal helpers that must never be exposed through the API. PostgREST only exposes the schemas listed in its db-schemas setting.';

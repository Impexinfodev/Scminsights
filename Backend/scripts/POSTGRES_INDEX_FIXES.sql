-- =============================================================================
-- POSTGRES_INDEX_FIXES.sql — SCM Insights Production Index Audit & Fixes
-- =============================================================================
-- Audit Date: March 2026
-- Auditor: Production-Readiness Review
-- Database: scm_insights (PostgreSQL)
-- Safe to run on live: all statements use CREATE INDEX IF NOT EXISTS / CONCURRENTLY
--
-- USAGE:
--   psql -U <user> -d scm_insights -f POSTGRES_INDEX_FIXES.sql
--
-- NOTE: Indexes marked CONCURRENTLY can be built without locking the table.
--       Run them during low-traffic windows on production.
-- =============================================================================


-- =============================================================================
-- SECTION 1: FINDINGS — trade_company_report
-- =============================================================================
--
-- FINDING 1: hs_code LIKE prefix search is locale-sensitive without text_pattern_ops.
--   Current index:  idx_trade_type_hs_year ON (trade_type, hs_code, year)
--   Problem: When the database collation is not "C" (e.g. en-US, en-IN),
--   B-tree indexes cannot support LIKE 'prefix%' queries without text_pattern_ops.
--   The planner will do a sequential scan instead of an index scan.
--   Fix: Add text_pattern_ops on hs_code for locale-safe prefix matching.
--
-- FINDING 2: ORDER BY frequency_ratio DESC with LIMIT/OFFSET is not covered.
--   The existing composite index (trade_type, hs_code, year, enterprise, data_country)
--   does NOT include frequency_ratio, so the planner cannot do an index-only scan
--   for sorted paginated queries — it must fetch rows and sort them.
--   Fix: Add a covering index that includes frequency_ratio for the most common
--   sort path (DESC) so sorted + paginated reads avoid heap fetches.
--
-- FINDING 3: Deep pagination (OFFSET) degrades at high page numbers.
--   Current code: LIMIT 100 OFFSET (page-1)*100. At page 50, OFFSET=4900 rows
--   are scanned and discarded. The 15s statement_timeout provides a safety net,
--   but high-page requests will be slow. Max page_size is 100, so in practice
--   the blast radius is limited — but the cursor-based query (Section 3) is
--   provided for future migration.
--
-- FINDING 4: No-year aggregation path (GROUP BY enterprise, data_country) has
--   no dedicated index for the GROUP BY columns. PostgreSQL will use a Hash
--   Aggregate or Sort Aggregate which requires full partition scans.
--   Fix: Partial index or materialized approach for cross-year aggregations.
--
-- FINDING 5: get_available_years uses SELECT DISTINCT year with LIKE — no partial
--   index for year-distinct queries.


-- =============================================================================
-- SECTION 2: FIXES — trade_company_report
-- =============================================================================

-- FIX 1: text_pattern_ops index for locale-safe hs_code LIKE 'prefix%' queries.
-- This allows the planner to use the index even with non-C collation databases.
-- Covers the WHERE trade_type = %s AND hs_code LIKE %s pattern in get_top_traders().
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_hs_text_pattern
ON trade_company_report (trade_type, hs_code text_pattern_ops, year);

-- FIX 2: Covering index for year-filtered sorted paginated queries.
-- Includes frequency_ratio DESC so the planner can serve ORDER BY + LIMIT
-- without a separate sort step (index-only scan path).
-- Covers: WHERE trade_type=? AND hs_code LIKE ? AND year=?
--         ORDER BY frequency_ratio DESC LIMIT ? OFFSET ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_sorted_year
ON trade_company_report (trade_type, hs_code text_pattern_ops, year, frequency_ratio DESC)
INCLUDE (enterprise, data_country, total_price, total_quantity, total_weight, total_container_quantity, percentage);

-- FIX 3: Index for no-year GROUP BY aggregation path.
-- Covers: WHERE trade_type=? AND hs_code LIKE ?
--         GROUP BY enterprise, data_country
--         ORDER BY SUM(frequency_ratio) DESC
-- The GROUP BY + SUM can use this index to avoid full table scans.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_agg_no_year
ON trade_company_report (trade_type, hs_code text_pattern_ops, enterprise, data_country)
INCLUDE (frequency_ratio, total_price, total_quantity, total_weight, total_container_quantity, percentage);

-- FIX 4: Index for get_available_years() — SELECT DISTINCT year.
-- This is a separate query shape that existing indexes don't optimize.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_years_distinct
ON trade_company_report (trade_type, hs_code text_pattern_ops, year ASC);

-- FIX 5: Country filter index — LOWER(data_country) LIKE LOWER('%country%').
-- NOTE: The LIKE '%country%' (both-sided wildcard) CANNOT use a B-tree index.
-- The existing idx_trade_data_country_lower cannot help for contains-search.
-- Recommendation: use pg_trgm GIN index for ILIKE '%country%'.
-- Enable extension first (requires superuser, run once):
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
--
-- Then:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_country_trigram
ON trade_company_report USING GIN (LOWER(data_country) gin_trgm_ops);

-- NOTE: The above requires pg_trgm extension. Run this first if not already done:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- =============================================================================
-- SECTION 3: CURSOR-BASED PAGINATION QUERY (Future Migration Reference)
-- =============================================================================
-- Current LIMIT/OFFSET degrades at high offsets. For page > 10, consider
-- keyset/cursor pagination using last_seen_id or (frequency_ratio, enterprise).
--
-- Current pattern (slow at high page):
--   SELECT ... FROM trade_company_report
--   WHERE trade_type = $1 AND hs_code LIKE $2 AND year = $3
--   ORDER BY frequency_ratio DESC LIMIT 100 OFFSET 900;
--
-- Cursor-based alternative (O(1) regardless of page number):
--   -- First page: no cursor
--   SELECT enterprise, data_country, frequency_ratio, ...
--   FROM trade_company_report
--   WHERE trade_type = $1 AND hs_code LIKE $2 AND year = $3
--   ORDER BY frequency_ratio DESC, enterprise ASC
--   LIMIT 100;
--
--   -- Next page: use last row's (frequency_ratio, enterprise) as cursor
--   SELECT enterprise, data_country, frequency_ratio, ...
--   FROM trade_company_report
--   WHERE trade_type = $1 AND hs_code LIKE $2 AND year = $3
--     AND (frequency_ratio, enterprise) < ($last_freq, $last_enterprise)
--   ORDER BY frequency_ratio DESC, enterprise ASC
--   LIMIT 100;
--
-- Trade-off: cursor pagination removes "jump to page N" capability.
-- For SCM Insights (max 100 rows, 60/min rate limit), OFFSET is acceptable
-- today, but this migration is recommended if row counts exceed 50,000.


-- =============================================================================
-- SECTION 4: HSCodeDescription — Prefix Search Fix
-- =============================================================================
--
-- FINDING: Current indexes on HSCodeDescription:
--   idx_hscode ON (HsCode)       — B-tree, may not support LIKE in non-C collation
--   idx_hscode_prefix ON left(HsCode, 2)  — limited prefix index, only 2-char prefix
--
-- FIX: Add text_pattern_ops for locale-safe prefix search on HsCode.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hscode_text_pattern
ON HSCodeDescription (HsCode text_pattern_ops);

-- FIX: Add GIN trigram index for full-text search on Description field
-- (useful for HSN keyword search by description text).
-- Requires pg_trgm extension (see Section 2, FIX 5 note).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hscode_description_trigram
ON HSCodeDescription USING GIN (to_tsvector('english', COALESCE(Description, '')));


-- =============================================================================
-- SECTION 5: SimsDirectory — Full-Text Search Optimization
-- =============================================================================
--
-- FINDING: CompanyName search uses LOWER(CompanyName) B-tree index.
--   For partial/fuzzy company name searches, this won't use the index.
--   LIKE '%name%' (both-sided wildcard) needs a GIN trigram index.
--
-- FIX: Add GIN trigram index for partial company name search.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sims_company_trigram
ON SimsDirectory USING GIN (LOWER(CompanyName) gin_trgm_ops);


-- =============================================================================
-- SECTION 6: Session Table — Expiry Cleanup & Auth Performance
-- =============================================================================
--
-- FINDING: idx_session_expiration exists but there is no index on UserId alone.
--   Auth middleware looks up sessions by SessionKey (PK — fast) but
--   session cleanup jobs that delete WHERE ExpirationTime < NOW()
--   and the UNIQUE(UserId, ClientId) constraint is only enforced via a unique index
--   (auto-created), not as a performance optimization for UserId-only lookups.
--
-- FIX: Partial index for non-expired sessions only — makes auth lookups faster
-- by excluding already-expired entries from the working index set.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_active
ON Session (SessionKey, ExpirationTime)
WHERE ExpirationTime > NOW();

-- Scheduled cleanup query (run via pg_cron or a maintenance script weekly):
-- DELETE FROM Session WHERE ExpirationTime < NOW() - INTERVAL '1 day';
-- DELETE FROM AccountActivation WHERE ExpirationTime < NOW() - INTERVAL '1 day';
-- DELETE FROM PasswordReset WHERE ExpirationTime < NOW() - INTERVAL '1 day';


-- =============================================================================
-- SECTION 7: PaymentTransaction — Query Optimization
-- =============================================================================
--
-- FINDING: Admin dashboard queries filter by (UserId, Status, CreatedAt).
--   Existing indexes: idx_payment_user, idx_payment_created, idx_payment_status
--   These are single-column; admin queries that filter by BOTH UserId AND Status
--   cannot use both indexes simultaneously (PG picks the most selective one).
--
-- FIX: Composite index for admin user+status filtering.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_user_status
ON PaymentTransaction (UserId, Status, CreatedAt DESC);

-- FIX: Index for webhook idempotency check (get_transaction_by_order_id).
-- RazorpayOrderId already has UNIQUE constraint (auto-indexed), this is already fast.
-- No additional index needed here.


-- =============================================================================
-- SECTION 8: CONNECTION POOL RECOMMENDATIONS (Code, not SQL)
-- =============================================================================
--
-- Current pool in trade_repository.py:
--   ConnectionPool(conninfo, min_size=1, max_size=10)
--
-- Issues:
--   1. No `timeout` — if all 10 connections are busy, new requests block forever
--      until a connection is freed or the 15s statement_timeout fires.
--   2. No `reconnect_timeout` — if DB restarts, pool will not recover automatically.
--   3. No `max_idle` — idle connections are held forever, wasting PostgreSQL resources.
--   4. min_size=1 means cold-start: the first request after idle must wait for
--      a new connection to be established.
--
-- Recommended settings (apply in trade_repository.py):
--   _pool = ConnectionPool(
--       conninfo,
--       min_size=2,               # Pre-warm 2 connections; avoids cold-start delay
--       max_size=10,              # Cap at 10; matches PostgreSQL max_connections budget
--       timeout=5.0,              # Raise PoolTimeout after 5s if no connection available
--       reconnect_timeout=10.0,   # Retry failed connections for up to 10s before giving up
--       max_idle=300,             # Close idle connections after 5 minutes
--       max_lifetime=3600,        # Recycle connections after 1 hour (prevents stale state)
--   )
--
-- Also: RepoProvider creates PostgresUserRepository and PostgresAdminRepository as
-- class-level singletons but does NOT use psycopg_pool — each repo creates its own
-- connection on demand (check postgres_user_repository.py). Migrate these repos to
-- also use ConnectionPool for connection reuse under load.


-- =============================================================================
-- SECTION 9: MAINTENANCE — VACUUM & ANALYZE
-- =============================================================================
--
-- After loading large data sets (seed_sims_directory, seed_hscodes, trade data import),
-- run these to update the query planner's statistics:
--
-- VACUUM ANALYZE trade_company_report;
-- VACUUM ANALYZE SimsDirectory;
-- VACUUM ANALYZE HSCodeDescription;
-- VACUUM ANALYZE PaymentTransaction;
-- VACUUM ANALYZE Session;
--
-- Consider enabling pg_cron for automated weekly VACUUM:
-- SELECT cron.schedule('weekly-vacuum', '0 2 * * 0', 'VACUUM ANALYZE trade_company_report;');


-- =============================================================================
-- SECTION 10: VERIFICATION QUERIES
-- =============================================================================
--
-- After applying indexes, verify the query planner uses them:
--
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
-- SELECT enterprise, data_country, frequency_ratio
-- FROM trade_company_report
-- WHERE trade_type = 'importer' AND hs_code LIKE '8471%' AND year = 2023
-- ORDER BY frequency_ratio DESC
-- LIMIT 25 OFFSET 0;
--
-- Expected: "Index Scan using idx_trade_sorted_year" (not Seq Scan)
-- If Seq Scan: run VACUUM ANALYZE trade_company_report; then re-check.
--
-- Check all new indexes were created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('trade_company_report', 'HSCodeDescription', 'SimsDirectory', 'Session', 'PaymentTransaction')
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

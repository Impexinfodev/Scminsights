-- Indexes for trade_company_report (buyers/suppliers list and aggregations).
-- Run against the same PostgreSQL DB as the app (POSTGRES_* config).
-- Creates indexes only if they do not exist.

-- Main filter: trade_type, hs_code, year (used in WHERE and ORDER BY)
CREATE INDEX IF NOT EXISTS idx_trade_type_hs_year
ON trade_company_report (trade_type, hs_code, year);

-- Country filter (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_trade_data_country_lower
ON trade_company_report (LOWER(data_country));

-- Optional: composite for common query pattern (trade_type + hs_code prefix + year)
CREATE INDEX IF NOT EXISTS idx_trade_type_hs_code_year
ON trade_company_report (trade_type, hs_code, year, enterprise, data_country);

-- trade_company_report: app uses frequency_ratio for the "Frequency" column.
-- Run against the same PostgreSQL DB as the app (POSTGRES_* config).

-- 1) Sample rows: frequency_ratio is what the app displays as Frequency
SELECT enterprise, data_country, frequency_ratio, total_price, total_quantity, total_weight, year, trade_type, hs_code
FROM trade_company_report
WHERE trade_type = 'importer'
LIMIT 20;

-- 2) Count frequency_ratio (used by app) vs legacy frequency
SELECT
  COUNT(*) FILTER (WHERE frequency_ratio IS NULL) AS null_frequency_ratio,
  COUNT(*) FILTER (WHERE frequency_ratio = 0)    AS zero_frequency_ratio,
  COUNT(*) FILTER (WHERE frequency_ratio > 0)    AS positive_frequency_ratio,
  COUNT(*)                                       AS total
FROM trade_company_report
WHERE trade_type = 'importer';

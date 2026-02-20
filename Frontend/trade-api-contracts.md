# Trade API Contracts

**Base URL:** `/api/trade`

**Auth:** None required (public endpoints)

**Content-Type:** `application/json`

---

1. `GET /api/trade/top` — List Top Importers/Exporters

---

Returns a paginated, sorted list of top importers or exporters matching an HS code prefix.

### Request — Query Parameters

+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| Param | Type | Required | Default | Description |
+=================+==========+==========+===============+===================================================================================+
| `trade_type` | string | Yes | — | `"importer"` or `"exporter"` |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `hs_code` | string | Yes | — | 2–10 digit HS code prefix (e.g. `"8471"`) |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `sort_by` | string | No | `frequency` | One of: `frequency`, `total_price`, `total_quantity`, `total_weight`, |
| | | | | `total_container_quantity`, `percentage` |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `sort_order` | string | No | `desc` | `"asc"` or `"desc"` |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `year` | integer | No | — | Filter to a specific year (e.g. `2024`). Omit to aggregate across all years. |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `country` | string | No | — | Case-insensitive partial match on country (e.g. `"india"`) |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `page` | integer | No | `1` | Page number (min 1) |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+
| `page_size` | integer | No | `25` | Items per page (min 1, max 100) |
+-----------------+----------+----------+---------------+-----------------------------------------------------------------------------------+

### Example Request

::

GET /api/trade/top?trade_type=importer&hs_code=8471&sort_by=total_price&sort_order=desc&year=2024&country=india&page=1&page_size=10

### Success Response — `200 OK`

.. code:: json

{
"success": true,
"data": [
{
"enterprise": "ACME ELECTRONICS PVT LTD",
"data_country": "INDIA",
"frequency": 142,
"total_price": 5832410.50,
"total_quantity": 28500,
"total_weight": 12340.75,
"total_container_quantity": 85,
"percentage": 3.42
},
{
"enterprise": "GLOBAL TECH IMPORTS",
"data_country": "INDIA",
"frequency": 98,
"total_price": 3210000.00,
"total_quantity": 15200,
"total_weight": 7800.00,
"total_container_quantity": 42,
"percentage": 2.15
}
],
"meta": {
"page": 1,
"page_size": 10,
"total_items": 387,
"total_pages": 39,
"has_next": true,
"has_prev": false,
"filters": {
"trade_type": "importer",
"hs_code_prefix": "8471",
"sort_by": "total_price",
"sort_order": "desc",
"year": 2024,
"country": "india"
}
}
}

### Data Item Fields

+-------------------------------+----------+------------------------------------------------------------------+
| Field | Type | Description |
+===============================+==========+==================================================================+
| `enterprise` | string | Company/enterprise name. Defaults to `""` if null. |
+-------------------------------+----------+------------------------------------------------------------------+
| `data_country` | string | Country of the enterprise. Defaults to `""` if null. |
+-------------------------------+----------+------------------------------------------------------------------+
| `frequency` | float | Number of trade transactions. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+
| `total_price` | float | Total trade value. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+
| `total_quantity` | float | Total quantity traded. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+
| `total_weight` | float | Total weight of goods. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+
| `total_container_quantity` | float | Total number of containers. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+
| `percentage` | float | Percentage share of trade. Defaults to `0`. |
+-------------------------------+----------+------------------------------------------------------------------+

### Pagination Metadata (`meta`)

+-------------------+---------+---------------------------------------------------------------+
| Field | Type | Description |
+===================+=========+===============================================================+
| `page` | integer | Current page number (1-indexed) |
+-------------------+---------+---------------------------------------------------------------+
| `page_size` | integer | Number of items per page |
+-------------------+---------+---------------------------------------------------------------+
| `total_items` | integer | Total number of matching records |
+-------------------+---------+---------------------------------------------------------------+
| `total_pages` | integer | Total number of pages |
+-------------------+---------+---------------------------------------------------------------+
| `has_next` | boolean | `true` if there is a next page |
+-------------------+---------+---------------------------------------------------------------+
| `has_prev` | boolean | `true` if there is a previous page |
+-------------------+---------+---------------------------------------------------------------+
| `filters` | object | Echo of the applied filters (see example above) |
+-------------------+---------+---------------------------------------------------------------+

---

2. `GET /api/trade/years` — Available Years

---

Returns the distinct years that have data for a given trade type and HS code prefix.

### Request — Query Parameters

+-----------------+----------+----------+---------+------------------------------------------+
| Param | Type | Required | Default | Description |
+=================+==========+==========+=========+==========================================+
| `trade_type` | string | Yes | — | `"importer"` or `"exporter"` |
+-----------------+----------+----------+---------+------------------------------------------+
| `hs_code` | string | Yes | — | 2–10 digit HS code prefix |
+-----------------+----------+----------+---------+------------------------------------------+

### Example Request

::

GET /api/trade/years?trade_type=exporter&hs_code=8471

### Success Response — `200 OK`

.. code:: json

{
"success": true,
"data": [2021, 2022, 2023, 2024, 2025]
}

`data` is a sorted array of integers (ascending).

---

3. `GET /api/trade/summary` — Aggregate Statistics

---

Returns aggregate statistics for the given filter set.

### Request — Query Parameters

+-----------------+----------+----------+---------+------------------------------------------------------------------------+
| Param | Type | Required | Default | Description |
+=================+==========+==========+=========+========================================================================+
| `trade_type` | string | Yes | — | `"importer"` or `"exporter"` |
+-----------------+----------+----------+---------+------------------------------------------------------------------------+
| `hs_code` | string | Yes | — | 2–10 digit HS code prefix |
+-----------------+----------+----------+---------+------------------------------------------------------------------------+
| `year` | integer | No | — | Filter to a specific year. Omit to aggregate all years. |
+-----------------+----------+----------+---------+------------------------------------------------------------------------+

### Example Request

::

GET /api/trade/summary?trade_type=importer&hs_code=8471&year=2024

### Success Response — `200 OK`

.. code:: json

{
"success": true,
"data": {
"total_enterprises": 387,
"total_value": 128450320.75,
"total_quantity": 5420000,
"total_weight": 2150000.50
}
}

### Summary Fields

+-----------------------+---------+-------------------------------------------------+
| Field | Type | Description |
+=======================+=========+=================================================+
| `total_enterprises` | integer | Count of unique enterprises matching the filter |
+-----------------------+---------+-------------------------------------------------+
| `total_value` | float | Sum of `total_price` across all matches |
+-----------------------+---------+-------------------------------------------------+
| `total_quantity` | float | Sum of `total_quantity` across all matches |
+-----------------------+---------+-------------------------------------------------+
| `total_weight` | float | Sum of `total_weight` across all matches |
+-----------------------+---------+-------------------------------------------------+

---

## Error Responses

All endpoints share the same error shapes.

### Validation Errors — `400`

.. code:: json

{
"error": "trade_type is required",
"code": "MISSING_TRADE_TYPE"
}

+------------------------+--------------------------------------------------+--------------------------------------------+
| Error Code | Message | Trigger |
+========================+==================================================+============================================+
| `MISSING_TRADE_TYPE` | `"trade_type is required"` | `trade_type` param missing |
+------------------------+--------------------------------------------------+--------------------------------------------+
| `INVALID_TRADE_TYPE` | `"trade_type must be 'importer' or 'exporter'"`| value is not `importer` / `exporter` |
+------------------------+--------------------------------------------------+--------------------------------------------+
| `MISSING_HS_CODE` | `"hs_code is required"` | `hs_code` param missing |
+------------------------+--------------------------------------------------+--------------------------------------------+
| `INVALID_HS_CODE` | `"hs_code must be 2-10 digits"` | non-numeric or wrong length |
+------------------------+--------------------------------------------------+--------------------------------------------+
| `INVALID_YEAR` | `"year must be an integer"` | non-integer year value |
+------------------------+--------------------------------------------------+--------------------------------------------+

### Server Errors — `500`

.. code:: json

{
"success": false,
"error": "Failed to fetch trade data. Please try again later."
}

---

## Notes for Frontend

- **All numeric values** (`frequency`, `total_price`, `total_quantity`, `total_weight`, `total_container_quantity`, `percentage`, summary stats) are **floats** — they can have decimals. Default to `0` when null.

- **String fields** (`enterprise`, `data_country`) default to `""` when null.

- **Pagination** is **1-indexed**. Use `has_next` / `has_prev` booleans to drive next/prev button states.

- **Omitting `year`** on `/top` triggers an aggregation (SUM) across all years grouped by enterprise + country. The response shape stays identical.

- **`sort_by`** silently falls back to `frequency` if an invalid column name is passed.

- **`country` filter** is a partial, case-insensitive match — e.g. `"ind"` will match both `"INDIA"` and `"INDONESIA"`.

- **`page_size`** is clamped to a maximum of `100`. Values above are reduced to `100`.

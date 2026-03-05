# Multi-Website Razorpay Integration

This document describes how to add **website/platform identification** to payment transactions when multiple websites share one Razorpay account. Use it to:

- Store which website each payment came from
- Filter transactions by website in your admin panel and exports
- Identify the source in the Razorpay dashboard (via order notes)

---

## 1. Column and schema

### Database

- **Table:** `PaymentTransaction`
- **New column:** `SourceWebsite` — `VARCHAR(255)`, nullable
- **Meaning:** Identifier for the website/platform that created the order (e.g. `scminsights`, `website-b`, `website-c`)

### SQL (for existing databases)

If your `PaymentTransaction` table already exists, add the column:

```sql
ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS SourceWebsite VARCHAR(255);
```

Optional index for filtering:

```sql
CREATE INDEX IF NOT EXISTS idx_payment_source_website ON PaymentTransaction (SourceWebsite);
```

For **new** installations, include `SourceWebsite` in your `CREATE TABLE PaymentTransaction (...)` definition.

---

## 2. Default website (environment)

Each deployment should have a **default website identifier** so that orders created without an explicit value still get a source.

- **Env variable:** `PAYMENT_SOURCE_WEBSITE`
- **Example values:** `scminsights`, `website-b`, `website-c` (use a short, stable string per site)
- **Default (if unset):** e.g. `scminsights` (or whatever you use for “this” site)

In your backend `.env`:

```env
# This site’s identifier for payments (used in Razorpay notes and DB)
PAYMENT_SOURCE_WEBSITE=scminsights
```

The other developer should set their own value, e.g. `PAYMENT_SOURCE_WEBSITE=website-b`.

---

## 3. Create-order API

### Request

- **Endpoint:** `POST /api/payment/create-order` (or your equivalent)
- **Body (existing):** e.g. `{ "license_type": "DIRECTORY" }`
- **Optional body field:** `website` (or `source_website`)

If the client sends `website`, use it (trimmed, max 255 chars). Otherwise use the server default from `PAYMENT_SOURCE_WEBSITE`.

### Backend behaviour

1. Resolve website: `website = body.website || body.source_website || PAYMENT_SOURCE_WEBSITE` (normalize and cap length).
2. When creating the Razorpay order, add to **notes**:
   - `user_id`, `license_type` (as you already do)
   - **`website`** = the resolved value (e.g. `scminsights`, `website-b`)
3. When inserting into `PaymentTransaction`, set **`SourceWebsite`** to that same value.

This way:

- Your DB has a dedicated column for filtering and reporting.
- Razorpay orders carry the same value in notes, so you can filter/export by “website” in the Razorpay dashboard.

---

## 4. Razorpay order notes

Razorpay allows custom **notes** on orders. We use them to pass the source website.

Example payload when creating the order:

```json
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "scm_user123_DIRECTORY_abc12345",
  "notes": {
    "user_id": "user123",
    "license_type": "DIRECTORY",
    "website": "scminsights"
  }
}
```

- **Key name:** `website` (same as our DB column concept).
- **Value:** Same as `PAYMENT_SOURCE_WEBSITE` or the value sent in the create-order body.

No change is required in verify or webhook for the website: it is set once at order creation and stored in your DB.

---

## 5. Admin: list and export

### List transactions

- **Query parameter:** `website` (optional)
- **Behaviour:** Filter transactions where `SourceWebsite = <value>`.
- **Response:** Include `SourceWebsite` (or `Website`) in each transaction object.

### Export (e.g. CSV)

- **Query parameter:** `website` (optional), same as list.
- **CSV column:** Add a **Website** column; value = `SourceWebsite` or empty.

This keeps admin and export consistent across all sites.

---

## 6. Frontend (admin)

- **Table:** Add a **Website** column showing `SourceWebsite` (or “—” when empty).
- **Filters:** Add a **Website** filter (e.g. text or dropdown) that sends the `website` query param to the list/export APIs.
- **Detail view:** If you have a transaction detail modal, show **Website** there as well.
- **Create-order (checkout):** Optionally send `website` in the body; if omitted, the backend uses `PAYMENT_SOURCE_WEBSITE`.

---

## 7. Checklist for the other developer

Use this to implement the same behaviour on another website that shares the same Razorpay account:

- [ ] **Database**
  - Add `SourceWebsite VARCHAR(255)` to `PaymentTransaction` (or run the `ALTER` above).
  - Optionally add index on `SourceWebsite`.

- [ ] **Config**
  - Add `PAYMENT_SOURCE_WEBSITE=<this-site-id>` to `.env` (e.g. `website-b`).

- [ ] **Create-order**
  - When calling Razorpay to create order, set `notes.website` to the resolved value (from request body or `PAYMENT_SOURCE_WEBSITE`).
  - When inserting into `PaymentTransaction`, set `SourceWebsite` to that value.

- [ ] **Admin APIs**
  - List transactions: support `website` query param; return `SourceWebsite` in each row.
  - Export: support `website` query param; add **Website** column to CSV.

- [ ] **Admin UI**
  - Show **Website** column in the transactions table.
  - Add **Website** filter and pass it to list/export.
  - Optionally show Website in transaction detail.

- [ ] **Razorpay dashboard**
  - Use order notes to filter or export by `website` so you can separate payments by site.

---

## 8. Summary

| Item | Description |
|------|-------------|
| **Column** | `PaymentTransaction.SourceWebsite` (VARCHAR 255, nullable) |
| **Default** | `PAYMENT_SOURCE_WEBSITE` in `.env` (e.g. `scminsights` for this site) |
| **Create-order** | Accept optional `website` in body; send same value in Razorpay `notes.website` and in DB `SourceWebsite` |
| **Admin** | Filter and column “Website” in list and export |
| **Razorpay** | Notes include `website` for dashboard filtering |

Keeping the same column name, env key, and note key across all sites keeps the integration consistent and easier to maintain.

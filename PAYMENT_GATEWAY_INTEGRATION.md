# Payment Gateway Integration Guide

This document explains how Razorpay and Checkout.com are integrated in this platform, how they are managed, and how to reuse the same pattern in another website on the same backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Admin UI — Payment Settings](#admin-ui--payment-settings)
5. [Backend API Reference](#backend-api-reference)
6. [How Each Gateway Works (Flow)](#how-each-gateway-works-flow)
   - [Razorpay (INR)](#razorpay-inr)
   - [Checkout.com (USD)](#checkoutcom-usd)
7. [Secret Key Security](#secret-key-security)
8. [Adding This to Another Website](#adding-this-to-another-website)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The platform supports **two payment gateways** simultaneously:

| Gateway | Currency | Use Case |
|---|---|---|
| **Razorpay** | INR (₹) | Indian customers, domestic payments |
| **Checkout.com** | USD ($) | International customers |

- The admin controls which gateways are enabled via **Admin → Payment Settings**.
- At least **one gateway must always remain active** — the backend enforces this rule.
- If **both** gateways are active, users are shown a **picker modal** to choose their preferred currency.
- If **only one** is active, the user goes directly to that gateway.
- API keys are **stored in the database** (not in `.env`), so they can be changed from the admin UI without redeploying.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│                                                         │
│  /upgrade page                                          │
│    ├── GET /api/payment/active-gateways                 │
│    ├── [Both active] → Gateway Picker Modal             │
│    │     ├── "Pay in ₹ INR"  → Razorpay flow           │
│    │     └── "Pay in $ USD"  → Checkout.com flow       │
│    └── [One active] → Direct to that gateway            │
│                                                         │
│  /admin/payment-settings page                           │
│    ├── GET /api/admin/payment-gateway-config            │
│    └── PUT /api/admin/payment-gateway-config            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  Backend (Flask)                                        │
│                                                         │
│  controllers/payment_controller.py  (/api/payment)      │
│  controllers/admin_controller.py    (/api/admin)        │
│                                                         │
│  repos/Admin/postgres_admin_repo.py                     │
│    └── PaymentGatewayConfig table (keys + toggle)       │
│                                                         │
│  PaymentTransaction table (all txns, all gateways)      │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┴───────────────┐
        │                                │
   Razorpay API                  Checkout.com API
   (orders, verify,              (payment-links,
    webhooks)                     status, webhooks)
```

---

## Database Schema

### `PaymentGatewayConfig`

Stores one row per gateway. Created automatically on first use (`CREATE TABLE IF NOT EXISTS`).

```sql
CREATE TABLE IF NOT EXISTS PaymentGatewayConfig (
    GatewayId       VARCHAR(50)  PRIMARY KEY,   -- 'razorpay' or 'checkout'
    IsActive        BOOLEAN      NOT NULL DEFAULT FALSE,
    KeyId           VARCHAR(500),               -- Public key / Key ID
    KeySecret       TEXT,                       -- Secret key (stored in plain text, never returned to frontend)
    WebhookSecret   TEXT,                       -- Webhook verification secret
    ExtraConfigJson TEXT         NOT NULL DEFAULT '{}',  -- JSON blob for extra settings
    UpdatedAt       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy       VARCHAR(255)                -- Email of admin who last updated
);
```

**ExtraConfigJson fields (Checkout.com):**

```json
{
  "processingChannelId": "pc_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sandboxMode": "true"
}
```

- `processingChannelId` — Required by Checkout.com. Found in your Checkout.com Dashboard → Settings → Channels.
- `sandboxMode` — `"true"` = sandbox API, `"false"` = live API. Takes priority over key prefix detection.

---

### `PaymentTransaction`

One row per payment attempt (both Razorpay and Checkout.com).

```sql
CREATE TABLE IF NOT EXISTS PaymentTransaction (
    TransactionId     VARCHAR(255) PRIMARY KEY,   -- UUID we generate
    UserId            VARCHAR(255),               -- User's email (= primary key in UserProfile)
    LicenseType       VARCHAR(255),               -- e.g. 'SILVER', 'GOLD'
    AmountINR         INTEGER,                    -- INR amount (0 for Checkout.com)
    Status            VARCHAR(50) DEFAULT 'CREATED', -- CREATED | COMPLETED | FAILED
    RazorpayOrderId   VARCHAR(255),               -- Razorpay order ID (also stores CKO payment-link ID)
    RazorpayPaymentId VARCHAR(255),               -- Razorpay payment ID
    SourceWebsite     VARCHAR(255),               -- e.g. 'impexinfo', 'kayease'
    Gateway           VARCHAR(50) DEFAULT 'razorpay', -- 'razorpay' or 'checkout'
    GatewayReference  VARCHAR(255),               -- Checkout.com payment-link ID (pl_...)
    CurrencyCode      VARCHAR(10) DEFAULT 'INR',  -- 'INR' or 'USD'
    AmountMinorUnits  BIGINT,                     -- Amount in cents/paise
    CreatedAt         TIMESTAMP,
    UpdatedAt         TIMESTAMP
);
```

---

## Admin UI — Payment Settings

**Route:** `/admin/payment-settings`

**File:** `impexinfo/app/admin/payment-settings/page.tsx`

Each gateway has its own card with:

| Field | Purpose |
|---|---|
| Enable/Disable toggle | Controls `IsActive` in DB |
| Key ID | Public key (Razorpay: `rzp_...`, Checkout.com: `pk_sbox_...` or `pk_...`) |
| Secret Key | Masked on load (shows `****xxxx`). Leave unchanged to keep existing value. |
| Webhook Secret | Same masking behaviour as Secret Key |
| *(Checkout.com only)* Processing Channel ID | Required — `pc_...` from Checkout.com Dashboard |
| *(Checkout.com only)* Sandbox Mode toggle | Forces sandbox API even if using live-looking keys |

**Rules enforced:**
- Disabling the last active gateway is blocked (backend returns 400).
- Saving with a masked secret value (e.g. `****abcd`) does **not** overwrite the stored secret — the backend detects this and preserves the real value.

---

## Backend API Reference

### Admin Endpoints (`/api/admin`)

#### `GET /api/admin/payment-gateway-config`
Returns config for all gateways. Secrets are masked.

**Response:**
```json
[
  {
    "gatewayId": "razorpay",
    "isActive": true,
    "keyId": "rzp_test_abc123",
    "keySecretMasked": "****cret",
    "webhookSecretMasked": "****hook",
    "extraConfig": {},
    "updatedAt": "2026-01-01T00:00:00+00:00",
    "updatedBy": "admin@example.com"
  },
  {
    "gatewayId": "checkout",
    "isActive": false,
    "keyId": "pk_sbox_abc123",
    "keySecretMasked": "****ef12",
    "webhookSecretMasked": null,
    "extraConfig": {
      "processingChannelId": "pc_abc123",
      "sandboxMode": "true"
    },
    "updatedAt": "2026-01-01T00:00:00+00:00",
    "updatedBy": "admin@example.com"
  }
]
```

#### `PUT /api/admin/payment-gateway-config`
Update one gateway's configuration.

**Request body:**
```json
{
  "gatewayId": "checkout",
  "isActive": true,
  "keyId": "pk_sbox_abc123",
  "keySecret": "sk_sbox_abc123",
  "webhookSecret": "",
  "extraConfig": {
    "processingChannelId": "pc_abc123",
    "sandboxMode": "true"
  }
}
```

- Leave `keySecret` / `webhookSecret` empty or as the masked value to keep the existing DB value.

---

### Payment Endpoints (`/api/payment`)

#### `GET /api/payment/active-gateways` *(auth required)*
Returns which gateways are currently active. Used by the frontend to decide whether to show the picker modal.

```json
{ "razorpay": true, "checkout": false }
```

---

#### Razorpay

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/payment/create-order` | Create Razorpay order, returns `order_id` |
| `POST` | `/api/payment/verify` | Verify signature after user pays; assigns license |
| `POST` | `/api/payment/webhook` | Razorpay webhook (S2S backup) |

---

#### Checkout.com

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/payment/checkout/create-session` | Create payment-link, returns `redirect_url` |
| `GET` | `/api/payment/checkout/status/<txn_id>` | Poll for payment completion |
| `POST` | `/api/payment/checkout/webhook` | Checkout.com webhook (S2S backup) |

---

## How Each Gateway Works (Flow)

### Razorpay (INR)

```
1. User clicks "Choose Plan" → frontend calls GET /api/payment/active-gateways
2. If Razorpay active → frontend calls POST /api/payment/create-order
   Backend: reads keys from DB → creates Razorpay order → saves row in PaymentTransaction
   Returns: { order_id, amount (paise), currency, key_id, transaction_id }

3. Frontend opens Razorpay checkout popup (client-side JS SDK) with those values.

4. User completes 3DS / UPI / card payment inside the popup.

5. On success, Razorpay calls the onSuccess callback with:
   { razorpay_order_id, razorpay_payment_id, razorpay_signature }

6. Frontend calls POST /api/payment/verify with those values + license_type.
   Backend: verifies HMAC signature → marks txn COMPLETED → assigns license.
   Returns: { message: "Payment verified and license assigned successfully" }

7. Razorpay also sends a webhook (payment.captured) to POST /api/payment/webhook
   as a server-side safety net (idempotent).
```

**Key file:** `backend/services/payment_service.py` — wraps the `razorpay` Python SDK.

---

### Checkout.com (USD)

```
1. User clicks "Choose Plan" → (gateway picker if both active) → selects USD option.

2. Frontend opens about:blank popup FIRST (before any async call) to avoid
   browser popup blocking (browsers block popups opened in async callbacks).

3. Frontend calls POST /api/payment/checkout/create-session with:
   { license_type, frontend_url: window.location.origin }
   Backend: reads keys from DB → calls Checkout.com /payment-links API →
   saves row in PaymentTransaction → returns { redirect_url, transaction_id }

4. Frontend navigates the popup to redirect_url (Checkout.com hosted payment page).

5. User enters card details on Checkout.com page (3DS if required).
   Sandbox test card: 4242424242424242 | any future date | any CVV
   3DS password (sandbox): Checkout1!

6. On success, Checkout.com redirects the popup to:
   {frontend_url}/upgrade?payment=success&txn={txn_id}

7. Frontend polls GET /api/payment/checkout/status/{txn_id} every 3 seconds.
   Backend first checks DB, then calls Checkout.com GET /payment-links/{id}.
   If status is "Payment Received" / "paid" / "completed" → assigns license.

8. Checkout.com also sends webhooks (payment_approved, payment_captured)
   to POST /api/payment/checkout/webhook as a server-side safety net.

9. Frontend detects success (popup URL contains payment=success OR poll returns COMPLETED)
   → shows success banner → popup closes.
```

**Important Checkout.com API details:**
- Uses **Payment Links API** (`/payment-links`), not the direct Payments API.
- Requires `processing_channel_id` (pc_...) in every request.
- Requires `billing.address.country` (we use `"IN"` — change as needed).
- Requires `customer.name` and `customer.email`.
- Sandbox URL: `https://api.sandbox.checkout.com`
- Live URL: `https://api.checkout.com`
- Status polling: normalize the status string with `.replace(" ", "").lower()` before comparing — Checkout.com returns `"Payment Received"` (with a space), not `"paymentreceived"`.

---

## Secret Key Security

Secret keys are **never returned to the frontend**. The `get_payment_gateway_configs()` function always masks them:

```python
def _mask_secret(value):
    if not value:
        return None
    visible = value[-4:]
    return f"{'*' * (len(value) - len(visible))}{visible}"
# "sk_sbox_abc123def456" → "****************f456"
```

When the admin saves settings, the backend checks if the submitted secret looks like a masked value (starts with `*`) or is empty. If so, the existing DB value is **kept unchanged**:

```python
def _is_unchanged(val):
    return not val or (isinstance(val, str) and val.startswith("*"))

final_secret = (existing_db_value) if _is_unchanged(submitted_secret) else submitted_secret
```

This prevents the masked display value from accidentally overwriting the real secret when the admin re-saves settings without touching the key fields.

---

## Adding This to Another Website

To reuse this payment system in another site on the same platform (e.g. `kayease`):

### 1. Backend — no code changes needed

The backend already supports multiple websites via the `SourceWebsite` column in `PaymentTransaction`. Set the source in your request:

```json
POST /api/payment/create-order
{
  "license_type": "GOLD",
  "website": "kayease"
}
```

The same API keys (from `PaymentGatewayConfig`) work for all websites. If you need **separate keys per website**, you would need to add a `SourceWebsite` column to `PaymentGatewayConfig` and update the key lookup logic.

### 2. Frontend — copy the payment flow

Copy these files to your new site and adjust the API base URL:

| File | What it does |
|---|---|
| `app/upgrade/UpgradePageClient.tsx` | Main payment flow (gateway picker, Razorpay popup, Checkout.com popup + polling) |
| `app/admin/payment-settings/page.tsx` | Admin UI for managing gateway keys |
| `app/admin/layout.tsx` | Admin nav (add "Payment Settings" link) |
| `components/ui/Toast.tsx` | Toast notification component |

**Key variables to change:**

```tsx
// In UpgradePageClient.tsx — point to your backend
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

// In checkout/create-session call — pass your site's origin
frontend_url: window.location.origin,

// The success_url and failure_url will be:
// {your-origin}/upgrade?payment=success&txn={txn_id}
// {your-origin}/upgrade?payment=failed&txn={txn_id}
```

### 3. License prices

In the **Admin → Licenses** page, set both prices on each license:
- `PriceINR` — used for Razorpay (in rupees, converted to paise internally)
- `PriceUSD` — used for Checkout.com (in dollars, converted to cents internally)

If `PriceUSD` is not set, the Checkout.com session endpoint returns a 400 error.

### 4. Checkout.com webhook endpoint

In your Checkout.com Dashboard → Workflows, set the webhook URL to:
```
https://your-backend.com/api/payment/checkout/webhook
```
Events to subscribe: `payment_approved`, `payment_captured`, `payment_declined`, `payment_expired`, `payment_cancelled`

### 5. Razorpay webhook endpoint

In Razorpay Dashboard → Settings → Webhooks:
```
https://your-backend.com/api/payment/webhook
```
Events: `payment.captured`, `payment.failed`

---

## Environment Variables

Payment keys are **not** in `.env` — they are managed entirely through the Admin UI and stored in the database. The only payment-related env var is:

```env
# backend/.env
PAYMENT_SOURCE_WEBSITE=impexinfo   # Default label for PaymentTransaction.SourceWebsite
```

All other backend env vars are for database, SMTP, CORS, etc. See `backend/.env.example` for the full list.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Checkout.com authentication failed (401)` | Wrong or masked secret key saved | Re-enter the `sk_sbox_...` key in Admin → Payment Settings and save |
| `processing_channel_id_required` | `processingChannelId` not set | Go to Admin → Payment Settings → Checkout.com → Advanced Settings and add your `pc_...` ID |
| `This license has no USD price` | `PriceUSD` not set on the license | Admin → Licenses → edit the license and add `PriceUSD` |
| `Cannot disable all payment gateways` | Trying to disable the last active gateway | Enable another gateway first |
| Popup blocked by browser | Popup opened after async call | Popup must be opened with `window.open()` BEFORE the `await fetch(...)` call |
| Status stuck in polling loop | Success redirect pointed to wrong URL | Pass `frontend_url: window.location.origin` in the `create-session` request body |
| Status always PENDING after payment | Checkout.com returns `"Payment Received"` (with space) | Normalize: `status.replace(" ", "").lower()` before comparing |
| Personal info shows wrong email in Checkout.com | `get_user_by_id` not returning email | Use `user_id` directly as email — in this system `UserId` = email address |

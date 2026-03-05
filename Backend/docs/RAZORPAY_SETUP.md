# Razorpay Setup – Test & Live (SCM Insights)

Payments are in **INR** only. Use Razorpay for test and live payments.

---

## 1. Create a Razorpay account

1. Go to [https://razorpay.com](https://razorpay.com) and sign up.
2. Complete KYC when you want to go **live** (test mode works without full KYC).

---

## 2. Test mode (development)

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Ensure you are in **Test Mode** (toggle at top: "Test mode" ON).
3. Go to **Settings → API Keys** (or **Developers → API Keys**).
4. Click **Generate Key** if you don’t have keys yet.
5. Copy:
   - **Key ID** (e.g. `rzp_test_xxxxxxxxxxxx`)
   - **Key Secret** (show and copy once).
6. In your backend `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_key_secret_here
   ```
7. **Website / App URL (optional for test):**  
   Under **Settings → Configurations** (or **Payment Configuration**), you can add:
   - **Website URL:** `http://localhost:3000` (your frontend in dev).  
   This is optional for test; checkout still works without it.

---

## 3. Live mode (production)

1. In Razorpay Dashboard, complete **account activation** and **KYC**.
2. Switch to **Live Mode** (toggle at top: "Test mode" OFF).
3. Go to **Settings → API Keys** and generate **Live** keys.
4. Put **Live** keys in your production environment (e.g. server `.env` or secrets):
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_live_secret_here
   ```
5. **Set your live website in Razorpay:**
   - Go to **Settings → Configurations** (or **Account & Settings → Configuration**).
   - Set **Website URL** to your live frontend, e.g. `https://scminsights.ai`.
   - Add the same under **Allowed Domains** / **Webhook / Redirect URLs** if the dashboard asks.
6. **Webhooks (optional):**  
   For payment confirmation via webhook (in addition to frontend verify):
   - **Webhook URL:** `https://your-backend-domain.com/api/payment/webhook` (if you add a webhook handler later).
   - **Events:** e.g. `payment.captured`, `payment.failed`.

---

## 4. Flow in this app

- **Create order:** Frontend calls `POST /api/payment/create-order` with `license_type` (e.g. `DIRECTORY`, `TRADE`, `BUNDLE`). Backend creates a Razorpay order (INR, amount from plan’s `PriceINR`) and returns `order_id`, `amount`, `key_id`.
- **Checkout:** Frontend loads Razorpay checkout script and opens checkout with `order_id`, `key_id`, `amount` (in paise), `currency: INR`. User pays on Razorpay’s page.
- **Verify:** After success, frontend calls `POST /api/payment/verify` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `license_type`. Backend verifies signature and assigns the plan to the user.

---

## 5. Summary

| Use case   | Mode   | Keys in `.env`     | Website URL in Razorpay      |
|-----------|--------|--------------------|------------------------------|
| Development | Test   | Test Key ID + Secret | Optional: `http://localhost:3000` |
| Production  | Live   | Live Key ID + Secret | Your live URL, e.g. `https://scminsights.ai` |

Keep **Key Secret** only on the server; never expose it in the frontend. The frontend only needs the **Key ID** (it is sent from the backend in the create-order response).

---

## 6. Webhook setup (Secret & Active events)

The backend exposes **one** webhook endpoint:

| Method | URL | Purpose |
|--------|-----|---------|
| POST   | `/api/payment/webhook` | Receives Razorpay events (payment.captured, payment.failed) |

**Full URL (production):** `https://api.scminsights.ai/api/payment/webhook`

Configure it in Razorpay Dashboard → **Webhooks** → **Webhook Setup**.

### Secret

- **What to add:** A **random secret string** that only you and your backend know. Razorpay signs each webhook request with this secret; your backend verifies the signature.
- **How to generate:** Use a strong random value, e.g.  
  - Terminal: `openssl rand -hex 32`  
  - Or any password generator (32+ characters).
- **Where to set it:**
  1. In the **Webhook Setup** dialog → **Secret** field: paste this value.
  2. In your backend **`.env`**: add the **same** value:
     ```env
     RAZORPAY_WEBHOOK_SECRET=the_exact_same_string_you_pasted_in_razorpay
     ```
- **Important:** The value in Razorpay and in `RAZORPAY_WEBHOOK_SECRET` must be **identical**. If you change it, update both.

### Active events (what to select)

For SCM Insights (one-time plan payments), subscribe only to what the backend handles:

| Category        | Event                | Why |
|-----------------|----------------------|-----|
| **Payment**     | `payment.captured`   | Success: backend updates transaction and assigns license (if not already done by frontend). |
| **Payment**     | `payment.failed`     | Failure: backend marks transaction as failed. |

**Recommended: select only these two:**

- ✅ **payment.captured**
- ✅ **payment.failed**

You can leave **all other events unchecked** (order, invoice, subscription, settlement, refund, etc.) unless you add handling for them later. Fewer events mean fewer webhook calls and simpler debugging.

After filling **Webhook URL**, **Secret**, and **Active events**, click **Create Webhook**. Razorpay will send a test event; ensure your backend is reachable at the URL and returns `200` after verifying the signature.

# DPDP Act 2023 & Indian Compliance Roadmap — SCM Insights

> **Act**: Digital Personal Data Protection Act, 2023 (DPDP Act)
> **Effective**: Rules expected to be notified in 2025; platforms should comply in advance.
> **Applicable because**: SCM Insights collects personal data (name, email, phone, company) of Indian users and processes it digitally.
> **Responsible Entity**: Aashita Technosoft Pvt. Ltd. (Data Fiduciary)

---

## Compliance Status Overview

| Requirement | DPDP Act Section | Current Status | Priority |
|-------------|-----------------|---------------|----------|
| Lawful basis for processing | §4 | Not explicitly documented | HIGH |
| Consent notice (clear, specific) | §5, §6 | Cookie consent only | HIGH |
| Right to access personal data | §11 | Not implemented | HIGH |
| Right to erasure (account deletion) | §12 | Not implemented | HIGH |
| Right to data portability | §13 | Not implemented | HIGH |
| Grievance redressal officer | §13(5) | Not designated | HIGH |
| Data retention policy | §8(7) | Not defined | HIGH |
| Data localisation (if applicable) | §16 | Unknown (check hosting) | MEDIUM |
| Privacy notice in English + Hindi | §5 | English only | MEDIUM |
| Children's data safeguards (under 18) | §9 | No age verification | MEDIUM |
| Processing by consent manager | §9 | Not applicable currently | LOW |
| Cross-border transfer restrictions | §16 | Razorpay data, email SMTP | MEDIUM |
| GSTIN on invoices | GST Act | Not implemented | HIGH |
| Privacy Policy — DPDP compliance | — | Outdated (pre-DPDP) | HIGH |

---

## PHASE 1 — Immediate (Complete within 30 days)

### 1.1 Designate a Data Protection Officer / Grievance Officer

**Requirement**: §13(5) — The Data Fiduciary must publish the name and contact of a Grievance Redressal Officer.

**Action**:
- Designate a responsible person (or use the founding director's email).
- Add to Privacy Policy page: name, email, and response time (within 48 hours per DPDP Act).
- Add to Contact page: "Data Protection Enquiries" section.

**File to update**: `Frontend/app/policy/page.tsx`

```
Data Protection Officer: [Name]
Company: Aashita Technosoft Pvt. Ltd.
Email: privacy@aashita.ai (or info@aashita.ai)
Response time: Within 48 business hours
```

---

### 1.2 Rewrite Privacy Policy for DPDP Compliance

**Requirement**: §5 — Notice must be clear, specific, and in plain language.

**Current gap**: The Privacy Policy was written before DPDP Act. It lacks:
- Specific list of personal data collected
- Purpose of processing for each category
- Retention periods
- Third parties data is shared with (Razorpay, Gmail SMTP)
- User rights under DPDP Act
- Grievance redressal mechanism

**Minimum required sections to add**:

```markdown
## Data We Collect
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Name, Email | Account creation, login | Until account deleted |
| Phone Number | Account verification | Until account deleted |
| Company Name, GST | Billing records | 7 years (tax law) |
| Payment details | Transaction record (Razorpay stores card data) | 7 years |
| IP Address, logs | Security, fraud prevention | 90 days |
| Search queries | Service delivery | 30 days |

## Third Parties We Share Data With
- **Razorpay**: Payment processing. Your payment data is processed by Razorpay
  Financial Services Ltd (NBFC). See: https://razorpay.com/privacy/
- **Google (Gmail SMTP)**: Email delivery. Activation and password reset emails
  are sent via Google's SMTP servers.

## Your Rights Under DPDP Act 2023
1. Right to access your personal data
2. Right to correct inaccurate data
3. Right to erase your account and data
4. Right to withdraw consent (closes your account)
5. Right to data portability (export your data)
6. Right to grievance redressal

## How to Exercise Rights
Email: privacy@aashita.ai with subject "DPDP Rights Request"
We will respond within 48 business hours.
```

---

### 1.3 Consent on Signup — Explicit DPDP Notice

**Requirement**: §6 — Consent must be free, specific, informed, and unambiguous.

**Current gap**: The signup form likely collects data without a clear DPDP notice.

**Action**: Add a checkbox on the signup form (NOT pre-checked):

```tsx
// Frontend/app/signup/page.tsx or SignupClient.tsx
<label>
  <input type="checkbox" required name="dpdp_consent" />
  I have read and agree to the{" "}
  <a href="/policy">Privacy Policy</a> and consent to processing of my
  personal data as described therein under the DPDP Act 2023.
</label>
```

**Backend**: Store `consent_given_at` timestamp in UserProfile table:

```sql
ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS ConsentGivenAt TIMESTAMPTZ;
ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS ConsentVersion VARCHAR(20) DEFAULT 'v1.0';
```

---

## PHASE 2 — User Rights Implementation (Complete within 60 days)

### 2.1 Right to Access — Data Download Endpoint

**Requirement**: §11 — User can request a copy of their personal data.

**Implementation**: Add endpoint in `user_controller.py`:

```
GET /api/user/data-export
Auth: Required (session token)
Response: JSON containing all user data from UserProfile, Session history (anonymized),
          PaymentTransaction records for that user.
```

**Response format**:
```json
{
  "export_generated_at": "2026-03-09T10:00:00Z",
  "personal_data": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "company": "...",
    "gst": "...",
    "account_created": "...",
    "license_type": "...",
    "license_valid_till": "..."
  },
  "payment_history": [
    {
      "date": "...",
      "plan": "...",
      "amount_inr": "...",
      "status": "..."
    }
  ]
}
```

**Frontend**: Add "Download My Data" button in `/profile` page.

---

### 2.2 Right to Erasure — Account Deletion Flow

**Requirement**: §12 — User can request deletion of their account and data.

**Current gap**: No account deletion exists in `user_controller.py`.

**Implementation**:

```
POST /api/user/delete-account
Auth: Required
Body: { "password": "...", "reason": "optional" }

Steps:
1. Verify password (bcrypt)
2. Delete Session records for user
3. Delete UserToken record
4. Delete AccountActivation / PasswordReset tokens
5. Anonymize PaymentTransaction (set EmailId = "deleted@anon", UserId = "DELETED_<hash>")
   -- Keep for 7 years for GST/tax law compliance (cannot delete financial records)
6. Delete UserProfile record
7. Send confirmation email: "Your SCM Insights account has been deleted."
```

**Retention exception**: Payment records must be retained 7 years for Income Tax Act / GST compliance. Anonymize rather than delete.

**Frontend**: Add "Delete Account" section in `/profile` with:
- Warning about data loss
- Password confirmation field
- 7-day cooling-off period (optional, recommended)

---

### 2.3 Right to Correction — Profile Update

**Requirement**: §11 — User can correct inaccurate data.

**Current state**: Check if `PUT /api/user/profile` exists and allows updating name, phone, company, GST.

**Action**: Ensure the profile update endpoint covers all editable fields and logs corrections with timestamp.

---

### 2.4 Right to Data Portability — Export in Machine-Readable Format

**Requirement**: §13 — User can request data in a structured, machine-readable format.

**Implementation**: The `/api/user/data-export` endpoint (Section 2.1) should also support:
- `?format=json` (default)
- `?format=csv` (for spreadsheet export)

Return as file download with proper `Content-Disposition: attachment` header.

---

## PHASE 3 — GST & Billing Compliance (Complete within 60 days)

### 3.1 GST Invoice Generation

**Requirement**: GST Act — B2B transactions require a GST-compliant invoice.

**Current gap**: No invoice is generated after payment.

**GST Details to include on invoice**:
- SCM Insights / Aashita Technosoft Pvt. Ltd. GSTIN
- Customer GSTIN (if provided in UserProfile.gst)
- Invoice number (sequential, financial year prefix)
- Date of supply
- Description of service: "Trade Intelligence Platform Subscription — [Plan Name]"
- HSN/SAC code: **998314** (Data processing and management services)
- Taxable amount
- IGST (18%) or CGST + SGST (9% + 9%) based on customer state
- Total amount

**Implementation approach**:
- Generate PDF invoice server-side after payment.captured event
- Store invoice number in PaymentTransaction (add `InvoiceNumber` column)
- Email invoice to user with activation confirmation

**Database change**:
```sql
ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS InvoiceNumber VARCHAR(50);
ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS GstAmountPaise INT DEFAULT 0;
ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS CustomerGst VARCHAR(20);
```

---

### 3.2 GST Rate & Calculation (Checkout)

**Requirement**: Display GST separately in checkout.

**Current gap**: `CheckoutPageClient.tsx` likely shows a single total. Amounts in Razorpay are stored as total (inclusive of GST).

**Action**:

```
Plan Price: ₹X (exclusive of GST)
+ GST @18%: ₹Y
= Total:    ₹Z

Amount charged via Razorpay: ₹Z (in paise: Z * 100)
```

GST type logic:
- If user's billing state == seller's state (e.g., Karnataka): CGST 9% + SGST 9%
- If different state: IGST 18%
- For now: default to IGST 18% (conservative) unless customer GSTIN is provided

---

## PHASE 4 — Children's Data & Consent Withdrawal (90 days)

### 4.1 Age Verification

**Requirement**: §9 — Data Fiduciary must not process personal data of children (under 18) without verifiable parental consent.

**Current state**: No age verification on signup.

**Minimum action**: Add a declaration checkbox on signup:
```
"I confirm that I am 18 years of age or older."
```

**If not complied with**: Processing children's data without consent is a significant DPDP penalty risk (up to ₹200 crore).

---

### 4.2 Consent Withdrawal = Account Closure

**Requirement**: §6(4) — Withdrawing consent must be as easy as giving it.

**Action**: The "Delete Account" flow (Section 2.2) doubles as consent withdrawal. Ensure the UI makes this clear:

```
"Withdrawing your consent will close your account and delete your data.
Active subscriptions will not be refunded per our Refund Policy."
```

---

## PHASE 5 — Data Localisation & Cross-Border Transfer (90 days)

### 5.1 Assess Current Cross-Border Data Flows

| Service | Data Transferred | Country | Risk |
|---------|-----------------|---------|------|
| Razorpay | Payment data, user email | India (Indian NBFC) | Low |
| Gmail SMTP | Email content, recipient address | Google servers (US?) | Medium |
| PostgreSQL hosting | All user data | Verify hosting region | HIGH |

**Action**:
- Confirm PostgreSQL is hosted in India (AWS Mumbai, Azure Central India, etc.)
- For Gmail SMTP: switch to AWS SES (Mumbai region) or Indian email provider
- Document all cross-border flows in the Privacy Policy

### 5.2 Data Residency

If hosting on a VPS outside India, migrate to:
- **AWS**: ap-south-1 (Mumbai)
- **Azure**: Central India
- **Google Cloud**: asia-south1 (Mumbai)

---

## PHASE 6 — Operational Compliance (Ongoing)

### 6.1 Data Retention Policy

| Data Category | Retention Period | Basis |
|--------------|-----------------|-------|
| User accounts | Until deletion request + 30 days | DPDP §8(7) |
| Session logs | 90 days | Security/fraud |
| Payment records | 7 years | Income Tax Act §54 |
| Contact form messages | 1 year | Business necessity |
| Application logs | 90 days rolling | Security |
| Activation/reset tokens | 24 hours after expiry | Auto-purge |

**Implementation**: Add a scheduled cleanup script:

```python
# tools/cleanup_expired_data.py (run weekly via cron)
# DELETE FROM Session WHERE ExpirationTime < NOW() - INTERVAL '7 days';
# DELETE FROM AccountActivation WHERE ExpirationTime < NOW() - INTERVAL '1 day';
# DELETE FROM PasswordReset WHERE ExpirationTime < NOW() - INTERVAL '1 day';
# Anonymize old ContactMessage: UPDATE ContactMessage SET Email='anon@deleted'
#   WHERE Status='replied' AND CreatedTime < NOW() - INTERVAL '1 year';
```

---

### 6.2 Security Safeguards Checklist (DPDP §8(5))

The DPDP Act requires "reasonable security safeguards." Map current status:

| Safeguard | Implementation | Status |
|-----------|---------------|--------|
| Password hashing | bcrypt | ✅ Done |
| HTTPS in production | SSL/TLS via gunicorn | ✅ Done |
| HSTS header | production only | ✅ Done |
| CSRF protection | Custom header check | ✅ Done (see CSRF audit note) |
| Rate limiting | Flask-Limiter | ✅ Done |
| SQL injection prevention | Parameterized queries | ✅ Done |
| Session expiry | ExpirationTime in Session table | ✅ Done |
| Rotating logs | RotatingFileHandler | ✅ Done |
| Encrypted backups | Not verified | ⚠️ Verify |
| Access control (admin) | Role-based (USER/ADMIN) | ✅ Done |
| Audit trail | Application logs | ⚠️ Partial (no dedicated audit log) |
| Penetration testing | Not documented | ❌ Missing |

---

### 6.3 Breach Notification

**Requirement**: DPDP Act requires reporting data breaches to the Data Protection Board within a prescribed timeframe (rules pending).

**Prepare**:
- Document an incident response procedure
- Define "data breach" for your context (unauthorized access to UserProfile, PaymentTransaction, etc.)
- Identify who to notify: Data Protection Board of India (once constituted)
- Internal escalation: CTO → Legal → DPO → Board notification

---

## PHASE 7 — Razorpay Webhook Robustness Checklist

Per the separate `RAZORPAY_WEBHOOK_ROBUSTNESS.py` audit:

| Item | Status | Fix |
|------|--------|-----|
| Webhook HMAC-SHA256 verified | ✅ Implemented | — |
| Idempotency (duplicate webhook) | ✅ Status check | — |
| payment.captured handler | ✅ Implemented | — |
| payment.failed handler | ✅ Implemented | — |
| GST invoice on capture | ❌ Missing | Phase 3 |
| Invoice email on capture | ❌ Missing | Phase 3 |
| Webhook event log (audit) | ⚠️ Application log only | Add dedicated table |

---

## Summary: Compliance Implementation Checklist

### Phase 1 (30 days) — Legal Minimum
- [ ] Designate Data Protection Officer / Grievance Redressal Officer
- [ ] Rewrite Privacy Policy with DPDP-required disclosures
- [ ] Add explicit DPDP consent checkbox on signup
- [ ] Add `ConsentGivenAt` column to UserProfile

### Phase 2 (60 days) — User Rights
- [ ] Implement `GET /api/user/data-export` (Right to Access)
- [ ] Implement `POST /api/user/delete-account` (Right to Erasure)
- [ ] Add "Download My Data" button in /profile
- [ ] Add "Delete Account" section in /profile
- [ ] Verify profile update covers all personal data fields

### Phase 3 (60 days) — GST Compliance
- [ ] Generate GST-compliant invoice PDF after payment
- [ ] Add `InvoiceNumber`, `GstAmountPaise`, `CustomerGst` to PaymentTransaction
- [ ] Display GST breakdown in checkout UI
- [ ] Email invoice PDF with plan activation confirmation

### Phase 4 (90 days) — Children & Consent
- [ ] Add age declaration checkbox on signup
- [ ] Link "Delete Account" to "Consent Withdrawal" in UI

### Phase 5 (90 days) — Data Localisation
- [ ] Confirm PostgreSQL is in India region
- [ ] Switch Gmail SMTP to AWS SES (Mumbai) or equivalent
- [ ] Document all cross-border data flows in Privacy Policy

### Phase 6 (Ongoing)
- [ ] Define and publish data retention policy
- [ ] Implement weekly data cleanup script
- [ ] Add encrypted backup verification
- [ ] Conduct first penetration test
- [ ] Prepare breach notification procedure

---

*Audit Date: March 2026*
*This roadmap is advisory and does not constitute legal advice.*
*Engage a qualified Indian technology lawyer before publishing compliance documents.*

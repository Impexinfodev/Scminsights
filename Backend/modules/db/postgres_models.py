# ===========================================
# SCM-INSIGHTS PostgreSQL schema (minimal)
# ===========================================

CREATE_USER_PROFILE_TABLE = """
CREATE TABLE IF NOT EXISTS UserProfile (
    UserId VARCHAR(255) PRIMARY KEY,
    EmailId VARCHAR(255) NOT NULL UNIQUE,
    Name VARCHAR(255) NOT NULL,
    HashPassword VARCHAR(255) NOT NULL,
    LogOnTimeStamp TIMESTAMPTZ,
    LicenseType VARCHAR(50) NOT NULL DEFAULT 'TRIAL',
    CompanyName VARCHAR(255),
    PhoneNumber VARCHAR(50),
    PhoneNumberCountryCode VARCHAR(15) DEFAULT '+91',
    gst VARCHAR(50),
    activationStatus BOOLEAN NOT NULL DEFAULT FALSE,
    LicenseValidTill TIMESTAMPTZ,
    Role VARCHAR(50) NOT NULL DEFAULT 'USER'
);
"""

CREATE_LICENSE_TABLE = """
CREATE TABLE IF NOT EXISTS License (
    LicenseType VARCHAR(50) PRIMARY KEY,
    LicenseInfoJson TEXT NOT NULL
);
"""

CREATE_SESSION_TABLE = """
CREATE TABLE IF NOT EXISTS Session (
    SessionKey VARCHAR(255) PRIMARY KEY,
    UserId VARCHAR(255) NOT NULL REFERENCES UserProfile(UserId) ON DELETE CASCADE,
    ExpirationTime TIMESTAMPTZ NOT NULL,
    ClientId VARCHAR(50) NOT NULL DEFAULT 'scm-insights',
    UNIQUE(UserId, ClientId)
);
"""
# Index for session expiry cleanup and auth lookups
SESSION_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_session_expiration ON Session (ExpirationTime);",
]

CREATE_USER_TOKEN_TABLE = """
CREATE TABLE IF NOT EXISTS UserToken (
    UserId VARCHAR(255) PRIMARY KEY REFERENCES UserProfile(UserId) ON DELETE CASCADE,
    StartTime TIMESTAMPTZ NOT NULL,
    EndTime TIMESTAMPTZ NOT NULL,
    TokensRemaining INT NOT NULL DEFAULT 0
);
"""

CREATE_ACTIVATION_TABLE = """
CREATE TABLE IF NOT EXISTS AccountActivation (
    ActivationToken VARCHAR(255) PRIMARY KEY,
    UserId VARCHAR(255) NOT NULL UNIQUE,
    ExpirationTime TIMESTAMPTZ NOT NULL
);
"""

# Migration: add UNIQUE constraint on UserId for existing AccountActivation tables
ACTIVATION_MIGRATE_STATEMENTS = [
    # Drop any duplicate rows first (keep the most recent token per user)
    """
    DELETE FROM AccountActivation a
    USING AccountActivation b
    WHERE a.ctid < b.ctid AND a.UserId = b.UserId;
    """,
    # Add the unique constraint if not already present
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'accountactivation'::regclass
              AND contype = 'u'
              AND conname = 'accountactivation_userid_key'
        ) THEN
            ALTER TABLE AccountActivation ADD CONSTRAINT accountactivation_userid_key UNIQUE (UserId);
        END IF;
    END $$;
    """,
]

CREATE_PASSWORD_RESET_TABLE = """
CREATE TABLE IF NOT EXISTS PasswordReset (
    ResetToken VARCHAR(255) PRIMARY KEY,
    UserId VARCHAR(255) NOT NULL,
    ExpirationTime TIMESTAMPTZ NOT NULL
);
"""

CREATE_CONTACT_TABLE = """
CREATE TABLE IF NOT EXISTS ContactMessage (
    ContactId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    Name VARCHAR(150) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(50) NOT NULL DEFAULT '',
    Message TEXT NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    CreatedTime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

DROP_USER_PROFILE_TABLE = "DROP TABLE IF EXISTS UserProfile CASCADE;"
DROP_LICENSE_TABLE = "DROP TABLE IF EXISTS License CASCADE;"
DROP_SESSION_TABLE = "DROP TABLE IF EXISTS Session CASCADE;"
DROP_USER_TOKEN_TABLE = "DROP TABLE IF EXISTS UserToken CASCADE;"
DROP_ACTIVATION_TABLE = "DROP TABLE IF EXISTS AccountActivation CASCADE;"
DROP_PASSWORD_RESET_TABLE = "DROP TABLE IF EXISTS PasswordReset CASCADE;"
DROP_CONTACT_TABLE = "DROP TABLE IF EXISTS ContactMessage CASCADE;"

# Payment transactions (Razorpay) - INR
CREATE_PAYMENT_TABLE = """
CREATE TABLE IF NOT EXISTS PaymentTransaction (
    Id SERIAL PRIMARY KEY,
    RazorpayOrderId VARCHAR(255) NOT NULL UNIQUE,
    RazorpayPaymentId VARCHAR(255),
    UserId VARCHAR(255) NOT NULL,
    EmailId VARCHAR(255) NOT NULL,
    LicenseType VARCHAR(50) NOT NULL,
    AmountPaise INT NOT NULL,
    Currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    Status VARCHAR(50) NOT NULL DEFAULT 'created',
    SourceWebsite VARCHAR(255),
    MetadataJson TEXT,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""
# Add SourceWebsite column to existing PaymentTransaction (run once per env)
ALTER_PAYMENT_ADD_SOURCE_WEBSITE = """
ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS SourceWebsite VARCHAR(255);
"""
PAYMENT_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_payment_user ON PaymentTransaction (UserId);",
    "CREATE INDEX IF NOT EXISTS idx_payment_created ON PaymentTransaction (CreatedAt DESC);",
    "CREATE INDEX IF NOT EXISTS idx_payment_status ON PaymentTransaction (Status);",
    "CREATE INDEX IF NOT EXISTS idx_payment_source_website ON PaymentTransaction (SourceWebsite);",
]
DROP_PAYMENT_TABLE = "DROP TABLE IF EXISTS PaymentTransaction CASCADE;"

# Multi-license: one row per active purchased plan per user.
# TRIAL is never stored here — it is the implicit fallback.
CREATE_USER_LICENSE_TABLE = """
CREATE TABLE IF NOT EXISTS UserLicense (
    Id SERIAL PRIMARY KEY,
    UserId VARCHAR(255) NOT NULL REFERENCES UserProfile(UserId) ON DELETE CASCADE,
    LicenseType VARCHAR(50) NOT NULL,
    ValidTill TIMESTAMPTZ NOT NULL,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(UserId, LicenseType)
);
"""
USER_LICENSE_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_userlicense_user ON UserLicense (UserId);",
    "CREATE INDEX IF NOT EXISTS idx_userlicense_validtill ON UserLicense (ValidTill);",
]
DROP_USER_LICENSE_TABLE = "DROP TABLE IF EXISTS UserLicense CASCADE;"

# HS Code descriptions (seeded from all_hscodes_with_descriptions.csv)
CREATE_HS_CODE_TABLE = """
CREATE TABLE IF NOT EXISTS HSCodeDescription (
    Id SERIAL PRIMARY KEY,
    HsCode VARCHAR(20) NOT NULL,
    Unit VARCHAR(50),
    Description TEXT,
    UNIQUE(HsCode)
);
"""
HS_CODE_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_hscode ON HSCodeDescription (HsCode);",
    "CREATE INDEX IF NOT EXISTS idx_hscode_prefix ON HSCodeDescription (left(HsCode, 2));",
]
DROP_HS_CODE_TABLE = "DROP TABLE IF EXISTS HSCodeDescription CASCADE;"

# SIMS Directory (Buyers/Importers); IecCode from sims-data.json
CREATE_SIMS_DIRECTORY_TABLE = """
CREATE TABLE IF NOT EXISTS SimsDirectory (
    Id SERIAL PRIMARY KEY,
    IecCode VARCHAR(50),
    CompanyName VARCHAR(255) NOT NULL,
    Email VARCHAR(255),
    Mobile VARCHAR(50),
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""
SIMS_DIRECTORY_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_sims_company_name ON SimsDirectory (LOWER(CompanyName));",
    "CREATE INDEX IF NOT EXISTS idx_sims_email ON SimsDirectory (LOWER(Email));",
    "CREATE INDEX IF NOT EXISTS idx_sims_mobile ON SimsDirectory (Mobile);",
    "CREATE INDEX IF NOT EXISTS idx_sims_ieccode ON SimsDirectory (IecCode);",
]
DROP_SIMS_DIRECTORY_TABLE = "DROP TABLE IF EXISTS SimsDirectory CASCADE;"

# ===========================================
# Payment Gateway Config — keys stored in DB
# Managed via Admin → Payment Settings UI
# ===========================================
CREATE_PAYMENT_GATEWAY_CONFIG_TABLE = """
CREATE TABLE IF NOT EXISTS PaymentGatewayConfig (
    GatewayId       VARCHAR(50)  PRIMARY KEY,
    IsActive        BOOLEAN      NOT NULL DEFAULT FALSE,
    KeyId           VARCHAR(500),
    KeySecret       TEXT,
    WebhookSecret   TEXT,
    ExtraConfigJson TEXT         NOT NULL DEFAULT '{}',
    UpdatedAt       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy       VARCHAR(255)
);
"""

# ALTER statements — add Checkout.com columns to existing PaymentTransaction
# Safe to run on live: ADD COLUMN IF NOT EXISTS
PAYMENT_TRANSACTION_ALTER_STATEMENTS = [
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS Gateway VARCHAR(50) DEFAULT 'razorpay';",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS GatewayReference VARCHAR(255);",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS CurrencyCode VARCHAR(10) DEFAULT 'INR';",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS AmountMinorUnits BIGINT;",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS TxnId VARCHAR(255);",
    "CREATE INDEX IF NOT EXISTS idx_payment_gateway_ref ON PaymentTransaction (GatewayReference);",
    "CREATE INDEX IF NOT EXISTS idx_payment_txn_id ON PaymentTransaction (TxnId);",
    # GST compliance (DPDP / GST Act)
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS InvoiceNumber VARCHAR(50);",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS GstAmountPaise INT DEFAULT 0;",
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS CustomerGst VARCHAR(20);",
    "CREATE INDEX IF NOT EXISTS idx_payment_invoice ON PaymentTransaction (InvoiceNumber);",
    # Test mode flag — set TRUE when order created with a test/sandbox key
    "ALTER TABLE PaymentTransaction ADD COLUMN IF NOT EXISTS IsTestMode BOOLEAN NOT NULL DEFAULT FALSE;",
    "CREATE INDEX IF NOT EXISTS idx_payment_test_mode ON PaymentTransaction (IsTestMode);",
]

# ALTER statements — DPDP Act 2023 consent tracking on UserProfile
USER_PROFILE_DPDP_ALTER_STATEMENTS = [
    "ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS ConsentGivenAt TIMESTAMPTZ;",
    "ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS ConsentVersion VARCHAR(20) DEFAULT 'v1.0';",
    # 30-day cooling-off period for account deletion (DPDP §12)
    "ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS DeletionScheduledAt TIMESTAMPTZ;",
]

# SEC-04: Per-account failed login tracking for lockout protection.
# FailedLoginAttempts increments on each bad password; resets to 0 on success.
# LockedUntil is set 15 minutes into the future after MAX_FAILED_ATTEMPTS failures.
USER_PROFILE_LOCKOUT_ALTER_STATEMENTS = [
    "ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS FailedLoginAttempts INT NOT NULL DEFAULT 0;",
    "ALTER TABLE UserProfile ADD COLUMN IF NOT EXISTS LockedUntil TIMESTAMPTZ;",
    "CREATE INDEX IF NOT EXISTS idx_user_locked_until ON UserProfile (LockedUntil) WHERE LockedUntil IS NOT NULL;",
]

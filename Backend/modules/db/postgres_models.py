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
    UserId VARCHAR(255) NOT NULL,
    ExpirationTime TIMESTAMPTZ NOT NULL
);
"""

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

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create loyalty_campaigns table
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    target_stamps INT NOT NULL CHECK (target_stamps > 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    prize_description TEXT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Nueva Campaña',
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_campaign_dates CHECK (start_date < end_date)
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES loyalty_campaigns(id) ON DELETE SET NULL,
    customer_phone VARCHAR(20) NOT NULL,
    invoice_number VARCHAR(100), -- Nullable for feedbacks submitted without purchase
    feedback_text TEXT NOT NULL,
    ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('positive', 'negative', 'neutral')),
    ai_category VARCHAR(20) CHECK (ai_category IN ('service', 'time', 'quality', 'cleanliness', 'other')),
    ai_spam_confidence BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL CHECK (status IN ('accumulated', 'redimidos', 'spam_hidden')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Nicaraguan phone format check: 8 digits starting with 5, 7, or 8
    CONSTRAINT chk_nicaraguan_phone CHECK (customer_phone ~ '^[578][0-9]{7}$')
);

-- 1. Composite Unique Index to strictly prevent duplicate receipt fraud (one invoice number per business)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_invoice_unique 
ON interactions (business_id, invoice_number) 
WHERE invoice_number IS NOT NULL;

-- 2. Compound Index to optimize spam cooldown queries (phone + business + created_at)
CREATE INDEX IF NOT EXISTS idx_customer_business_created
ON interactions (customer_phone, business_id, created_at DESC);

-- Index for checking active campaigns
CREATE INDEX IF NOT EXISTS idx_campaign_dates 
ON loyalty_campaigns (business_id, start_date, end_date);

-- Create one_time_codes table
CREATE TABLE IF NOT EXISTS one_time_codes (
    code VARCHAR(50) PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES loyalty_campaigns(id) ON DELETE CASCADE,
    is_associated BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    customer_phone VARCHAR(20),
    associated_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

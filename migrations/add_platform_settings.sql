CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value DECIMAL(5,2) NOT NULL
);

INSERT IGNORE INTO platform_settings (setting_key, setting_value)
VALUES ('platform_fee_percent', 10.00);
CREATE TABLE IF NOT EXISTS shipments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tracking_number VARCHAR(30) NOT NULL UNIQUE,

    user_id BIGINT UNSIGNED NOT NULL,

    sender_name VARCHAR(100) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,

    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    receiver_address TEXT NOT NULL,

    package_description VARCHAR(255) NOT NULL,

    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    status ENUM(
        'pending',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id),

    INDEX idx_shipments_user_id (user_id),

    INDEX idx_shipments_tracking_number (tracking_number)
);
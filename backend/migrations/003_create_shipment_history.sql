CREATE TABLE IF NOT EXISTS shipment_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    shipment_id BIGINT UNSIGNED NOT NULL,

    old_status VARCHAR(30),

    new_status VARCHAR(30) NOT NULL,

    notes TEXT,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shipment_id)
        REFERENCES shipments(id)
        ON DELETE CASCADE,

    INDEX idx_history_shipment_id (shipment_id)
);
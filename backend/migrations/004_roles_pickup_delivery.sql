-- Run ONCE after 003. Do not rerun against databases already manually patched.
ALTER TABLE users ADD COLUMN role ENUM('customer','courier','admin') NOT NULL DEFAULT 'customer';
ALTER TABLE shipments
 ADD COLUMN courier_id BIGINT UNSIGNED NULL AFTER user_id,
 ADD COLUMN pickup_address TEXT NULL AFTER sender_phone,
 ADD COLUMN delivery_time DATETIME NULL AFTER receiver_address,
 ADD CONSTRAINT fk_shipments_courier FOREIGN KEY (courier_id) REFERENCES users(id) ON DELETE SET NULL,
 ADD INDEX idx_shipments_courier_id (courier_id);

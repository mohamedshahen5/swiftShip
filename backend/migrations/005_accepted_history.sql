-- Run ONCE after 004.
ALTER TABLE shipments
 MODIFY COLUMN status ENUM('pending','assigned','accepted','picked_up','in_transit','delivered','cancelled') NOT NULL DEFAULT 'pending',
 ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 ADD INDEX idx_shipments_status (status);
ALTER TABLE shipment_history
 ADD COLUMN changed_by BIGINT UNSIGNED NULL AFTER notes,
 ADD CONSTRAINT fk_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

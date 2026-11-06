package handlers

import (
	"database/sql"
	"toolsProject/backend/models"
)

const shipmentSelect = `SELECT s.id,s.tracking_number,s.status,s.created_at,s.updated_at,s.sender_name,s.sender_phone,s.pickup_address,s.receiver_name,s.receiver_phone,s.receiver_address,s.delivery_time,s.package_description,s.delivery_fee,u.id,u.name,u.phone,cu.id,cu.name,cu.phone FROM shipments s JOIN users u ON u.id=s.user_id LEFT JOIN users cu ON cu.id=s.courier_id`

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanShipment(r rowScanner) (models.Shipment, error) {
	var s models.Shipment
	var pickup, delivery sql.NullString
	var cid sql.NullInt64
	var cname, cphone sql.NullString
	err := r.Scan(&s.ID, &s.TrackingNumber, &s.Status, &s.CreatedAt, &s.UpdatedAt, &s.SenderName, &s.SenderPhone, &pickup, &s.ReceiverName, &s.ReceiverPhone, &s.ReceiverAddress, &delivery, &s.PackageDescription, &s.DeliveryFee, &s.Customer.ID, &s.Customer.Name, &s.Customer.Phone, &cid, &cname, &cphone)
	if err != nil {
		return s, err
	}
	if pickup.Valid {
		s.PickupAddress = &pickup.String
	}
	if delivery.Valid {
		s.DeliveryTime = &delivery.String
	}
	if cid.Valid {
		s.Courier = &models.ShipmentUser{ID: uint64(cid.Int64), Name: cname.String, Phone: cphone.String}
	}
	return s, nil
}
func listShipments(db *sql.DB, where string, args ...interface{}) ([]models.Shipment, error) {
	rows, err := db.Query(shipmentSelect+" WHERE "+where+" ORDER BY s.created_at DESC,s.id DESC", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Shipment, 0)
	for rows.Next() {
		s, e := scanShipment(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

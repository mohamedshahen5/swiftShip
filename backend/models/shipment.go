package models

type ShipmentUser struct {
	ID    uint64 `json:"id"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}
type Shipment struct {
	ID                 uint64        `json:"id"`
	TrackingNumber     string        `json:"tracking_number"`
	Status             string        `json:"status"`
	CreatedAt          string        `json:"created_at"`
	UpdatedAt          string        `json:"updated_at"`
	SenderName         string        `json:"sender_name"`
	SenderPhone        string        `json:"sender_phone"`
	PickupAddress      *string       `json:"pickup_address"`
	ReceiverName       string        `json:"receiver_name"`
	ReceiverPhone      string        `json:"receiver_phone"`
	ReceiverAddress    string        `json:"receiver_address"`
	DeliveryTime       *string       `json:"delivery_time"`
	PackageDescription string        `json:"package_description"`
	DeliveryFee        float64       `json:"delivery_fee"`
	Customer           ShipmentUser  `json:"customer"`
	Courier            *ShipmentUser `json:"courier"`
}

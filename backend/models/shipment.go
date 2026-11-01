package models

type Shipment struct {
	ID                 uint64  `json:"id"`
	TrackingNumber     string  `json:"tracking_number"`
	UserID             uint64  `json:"user_id"`
	SenderName         string  `json:"sender_name"`
	SenderPhone        string  `json:"sender_phone"`
	ReceiverName       string  `json:"receiver_name"`
	ReceiverPhone      string  `json:"receiver_phone"`
	ReceiverAddress    string  `json:"receiver_address"`
	PackageDescription string  `json:"package_description"`
	DeliveryFee        float64 `json:"delivery_fee"`
	Status             string  `json:"status"`
	CreatedAt          string  `json:"created_at"`
}

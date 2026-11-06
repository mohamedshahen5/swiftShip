package handlers

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"math"
	"net/http"
	"strings"
	"time"
	"toolsProject/backend/utils"
)

type CreateShipmentRequest struct {
	SenderName         string  `json:"sender_name"`
	SenderPhone        string  `json:"sender_phone"`
	PickupAddress      *string `json:"pickup_address"`
	ReceiverName       string  `json:"receiver_name"`
	ReceiverPhone      string  `json:"receiver_phone"`
	ReceiverAddress    string  `json:"receiver_address"`
	DeliveryTime       *string `json:"delivery_time"`
	PackageDescription string  `json:"package_description"`
	DeliveryFee        float64 `json:"delivery_fee"`
}

func CreateShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var r CreateShipmentRequest
		if c.ShouldBindJSON(&r) != nil {
			c.JSON(400, gin.H{"message": "Invalid JSON"})
			return
		}
		r.SenderName = strings.TrimSpace(r.SenderName)
		r.SenderPhone = strings.TrimSpace(r.SenderPhone)
		r.ReceiverName = strings.TrimSpace(r.ReceiverName)
		r.ReceiverPhone = strings.TrimSpace(r.ReceiverPhone)
		r.ReceiverAddress = strings.TrimSpace(r.ReceiverAddress)
		r.PackageDescription = strings.TrimSpace(r.PackageDescription)
		if r.SenderName == "" || len(r.SenderName) > 100 || r.ReceiverName == "" || len(r.ReceiverName) > 100 || r.SenderPhone == "" || len(r.SenderPhone) > 20 || r.ReceiverPhone == "" || len(r.ReceiverPhone) > 20 || r.ReceiverAddress == "" || len(r.ReceiverAddress) > 2000 || r.PackageDescription == "" || len(r.PackageDescription) > 255 || r.DeliveryFee < 0 || r.DeliveryFee > 99999999 || math.IsNaN(r.DeliveryFee) || math.IsInf(r.DeliveryFee, 0) {
			c.JSON(400, gin.H{"message": "Invalid or oversized shipment fields"})
			return
		}
		var pickup, delivery interface{}
		if r.PickupAddress != nil {
			v := strings.TrimSpace(*r.PickupAddress)
			if len(v) > 2000 {
				c.JSON(400, gin.H{"message": "Pickup address too long"})
				return
			}
			if v != "" {
				pickup = v
			}
		}
		if r.DeliveryTime != nil && *r.DeliveryTime != "" {
			v := strings.TrimSpace(*r.DeliveryTime)
			if _, parseErr := time.Parse("2006-01-02 15:04:05", v); parseErr != nil {
				c.JSON(400, gin.H{"message": "delivery_time must be YYYY-MM-DD HH:MM:SS"})
				return
			}
			delivery = v
		}
		uid, _ := CurrentUser(c)
		tracking, err := utils.GenerateTrackingNumber()
		if err != nil {
			c.JSON(500, gin.H{"message": "Tracking number failed"})
			return
		}
		tx, err := db.BeginTx(c.Request.Context(), nil)
		if err != nil {
			c.JSON(500, gin.H{"message": "Transaction failed"})
			return
		}
		defer tx.Rollback()
		res, err := tx.Exec(`INSERT INTO shipments(tracking_number,user_id,sender_name,sender_phone,pickup_address,receiver_name,receiver_phone,receiver_address,delivery_time,package_description,delivery_fee) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, tracking, uid, r.SenderName, r.SenderPhone, pickup, r.ReceiverName, r.ReceiverPhone, r.ReceiverAddress, delivery, r.PackageDescription, r.DeliveryFee)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Shipment insert failed"})
			return
		}
		id, err := res.LastInsertId()
		if err != nil {
			c.JSON(500, gin.H{"message": "ID error"})
			return
		}
		if err = RecordHistory(tx, uint64(id), "", "pending", "Shipment created", uid); err != nil {
			c.JSON(500, gin.H{"message": "History failed"})
			return
		}
		if err = tx.Commit(); err != nil {
			c.JSON(500, gin.H{"message": "Commit failed"})
			return
		}
		c.JSON(201, gin.H{"message": "Shipment created successfully", "id": id, "tracking_number": tracking, "status": "pending"})
	}
}

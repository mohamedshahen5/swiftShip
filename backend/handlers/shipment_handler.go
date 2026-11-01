package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"toolsProject/backend/utils"
)

type CreateShipmentRequest struct {
	SenderName         string  `json:"sender_name" binding:"required"`
	SenderPhone        string  `json:"sender_phone" binding:"required"`
	ReceiverName       string  `json:"receiver_name" binding:"required"`
	ReceiverPhone      string  `json:"receiver_phone" binding:"required"`
	ReceiverAddress    string  `json:"receiver_address" binding:"required"`
	PackageDescription string  `json:"package_description" binding:"required"`
	DeliveryFee        float64 `json:"delivery_fee"`
}

func CreateShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateShipmentRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Invalid request data",
			})
			return
		}

		// Trim whitespace from string fields.
		req.SenderName = strings.TrimSpace(req.SenderName)
		req.SenderPhone = strings.TrimSpace(req.SenderPhone)
		req.ReceiverName = strings.TrimSpace(req.ReceiverName)
		req.ReceiverPhone = strings.TrimSpace(req.ReceiverPhone)
		req.ReceiverAddress = strings.TrimSpace(req.ReceiverAddress)
		req.PackageDescription = strings.TrimSpace(req.PackageDescription)

		if req.SenderName == "" ||
			req.SenderPhone == "" ||
			req.ReceiverName == "" ||
			req.ReceiverPhone == "" ||
			req.ReceiverAddress == "" ||
			req.PackageDescription == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "All shipment fields are required",
			})
			return
		}

		if req.DeliveryFee < 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Delivery fee cannot be negative",
			})
			return
		}

		// Get the authenticated user's ID from the JWT middleware.
		userIDValue, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "User not authenticated",
			})
			return
		}

		userID, ok := userIDValue.(uint64)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Invalid authenticated user",
			})
			return
		}

		// Generate a tracking number.
		// This is a simple first version; we'll improve it later.
		// var shipmentID uint64

		trackingNumber, err := utils.GenerateTrackingNumber()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to generate tracking number",
			})
			return
		}

		result, err := db.Exec(`
			INSERT INTO shipments (
				tracking_number,
				user_id,
				sender_name,
				sender_phone,
				receiver_name,
				receiver_phone,
				receiver_address,
				package_description,
				delivery_fee
			)
			VALUES (
				?,
				?,
				?,
				?,
				?,
				?,
				?,
				?,
				?
			)
		`,
			trackingNumber,
			userID,
			req.SenderName,
			req.SenderPhone,
			req.ReceiverName,
			req.ReceiverPhone,
			req.ReceiverAddress,
			req.PackageDescription,
			req.DeliveryFee,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to create shipment",
			})
			return
		}

		lastID, err := result.LastInsertId()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to retrieve shipment ID",
			})
			return
		}
		shipmentID := uint64(lastID)

		_, err = db.Exec(`
    INSERT INTO shipment_history (
        shipment_id,
        old_status,
        new_status,
        notes
    )
    VALUES (?, ?, ?, ?)
`, shipmentID, nil, "pending", "Shipment created")

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Shipment created but failed to record history",
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":         "Shipment created successfully",
			"id":              shipmentID,
			"tracking_number": trackingNumber,
			"status":          "pending",
		})
	}
}

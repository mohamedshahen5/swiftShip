package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func TrackShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		// Get tracking number from URL.
		trackingNumber := c.Param("trackingNumber")

		if trackingNumber == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Tracking number is required",
			})
			return
		}

		// Search for the shipment.
		var shipment struct {
			TrackingNumber     string `json:"tracking_number"`
			ReceiverName       string `json:"receiver_name"`
			ReceiverAddress    string `json:"receiver_address"`
			PackageDescription string `json:"package_description"`
			Status             string `json:"status"`
			CreatedAt          string `json:"created_at"`
		}

		err := db.QueryRow(`
			SELECT
				tracking_number,
				receiver_name,
				receiver_address,
				package_description,
				status,
				created_at
			FROM shipments
			WHERE tracking_number = ?
		`, trackingNumber).Scan(
			&shipment.TrackingNumber,
			&shipment.ReceiverName,
			&shipment.ReceiverAddress,
			&shipment.PackageDescription,
			&shipment.Status,
			&shipment.CreatedAt,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"message": "Shipment not found",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to track shipment",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Shipment found",
			"shipment": shipment,
		})
	}
}

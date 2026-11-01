package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetMyShipments(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		rows, err := db.Query(`
			SELECT
				id,
				tracking_number,
				sender_name,
				sender_phone,
				receiver_name,
				receiver_phone,
				receiver_address,
				package_description,
				delivery_fee,
				status,
				created_at
			FROM shipments
			WHERE user_id = ?
			ORDER BY created_at DESC
		`, userID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to retrieve shipments",
			})
			return
		}
		defer rows.Close()

		shipments := make([]gin.H, 0)

		for rows.Next() {
			var (
				id                 uint64
				trackingNumber     string
				senderName         string
				senderPhone        string
				receiverName       string
				receiverPhone      string
				receiverAddress    string
				packageDescription string
				deliveryFee        float64
				status             string
				createdAt          string
			)

			err := rows.Scan(
				&id,
				&trackingNumber,
				&senderName,
				&senderPhone,
				&receiverName,
				&receiverPhone,
				&receiverAddress,
				&packageDescription,
				&deliveryFee,
				&status,
				&createdAt,
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"message": "Failed to read shipment data",
				})
				return
			}

			shipments = append(shipments, gin.H{
				"id":                  id,
				"tracking_number":     trackingNumber,
				"sender_name":         senderName,
				"sender_phone":        senderPhone,
				"receiver_name":       receiverName,
				"receiver_phone":      receiverPhone,
				"receiver_address":    receiverAddress,
				"package_description": packageDescription,
				"delivery_fee":        deliveryFee,
				"status":              status,
				"created_at":          createdAt,
			})
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to retrieve shipments",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"count":     len(shipments),
			"shipments": shipments,
		})
	}
}
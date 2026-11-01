package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetShipmentHistory(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		trackingNumber := c.Param("trackingNumber")

		// First, find the shipment ID.
		var shipmentID uint64

		err := db.QueryRow(`
			SELECT id
			FROM shipments
			WHERE tracking_number = ?
		`, trackingNumber).Scan(&shipmentID)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"message": "Shipment not found",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to find shipment",
			})
			return
		}

		// Retrieve shipment history.
		rows, err := db.Query(`
			SELECT old_status, new_status, notes, changed_at
			FROM shipment_history
			WHERE shipment_id = ?
			ORDER BY changed_at ASC, id ASC
		`, shipmentID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to retrieve shipment history",
			})
			return
		}
		defer rows.Close()

		history := make([]gin.H, 0)

		for rows.Next() {
			var (
				oldStatus sql.NullString
				newStatus string
				notes     sql.NullString
				changedAt string
			)

			if err := rows.Scan(
				&oldStatus,
				&newStatus,
				&notes,
				&changedAt,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"message": "Failed to read history",
				})
				return
			}

			history = append(history, gin.H{
				"old_status": oldStatus.String,
				"new_status": newStatus,
				"notes":      notes.String,
				"changed_at": changedAt,
			})
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to read shipment history",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"tracking_number": trackingNumber,
			"history":         history,
		})
	}
}
package handlers

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"strconv"
)

func GetShipmentDetails(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, e := strconv.ParseUint(c.Param("id"), 10, 64)
		if e != nil {
			c.JSON(400, gin.H{"message": "Invalid shipment ID"})
			return
		}
		s, e := scanShipment(db.QueryRow(shipmentSelect+" WHERE s.id=?", id))
		if e == sql.ErrNoRows {
			c.JSON(404, gin.H{"message": "Shipment not found"})
			return
		}
		if e != nil {
			c.JSON(500, gin.H{"message": "Unable to fetch shipment"})
			return
		}
		uid, role := CurrentUser(c)
		if !CanView(role, uid, s) {
			c.JSON(403, gin.H{"message": "Forbidden"})
			return
		}
		c.JSON(200, s)
	}
}

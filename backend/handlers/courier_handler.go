package handlers

import (
	"database/sql"
	"github.com/gin-gonic/gin"
)

func CourierShipments(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := CurrentUser(c)
		s, e := listShipments(db, "s.courier_id=?", uid)
		if e != nil {
			c.JSON(500, gin.H{"message": "Unable to fetch shipments"})
			return
		}
		c.JSON(200, gin.H{"count": len(s), "shipments": s})
	}
}
func CourierAccept(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) { changeStatus(db, c, "accepted", "Courier accepted", nil) }
}
func CourierDecline(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) { changeStatus(db, c, "pending", "Courier declined", nil) }
}

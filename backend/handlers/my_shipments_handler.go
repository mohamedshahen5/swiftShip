package handlers

import (
	"database/sql"
	"github.com/gin-gonic/gin"
)

func GetMyShipments(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := CurrentUser(c)
		items, err := listShipments(db, "s.user_id=?", uid)
		if err != nil {
			c.JSON(500, gin.H{"message": "Could not load shipments"})
			return
		}
		c.JSON(200, gin.H{"count": len(items), "shipments": items})
	}
}

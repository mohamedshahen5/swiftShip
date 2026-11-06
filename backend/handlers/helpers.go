package handlers

import (
	"github.com/gin-gonic/gin"
	"toolsProject/backend/models"
)

func CurrentUser(c *gin.Context) (uint64, string) {
	id, _ := c.Get("userID")
	role, _ := c.Get("userRole")
	u, _ := id.(uint64)
	r, _ := role.(string)
	return u, r
}
func CanView(role string, userID uint64, s models.Shipment) bool {
	return role == "admin" || role == "customer" && s.Customer.ID == userID || role == "courier" && s.Courier != nil && s.Courier.ID == userID
}

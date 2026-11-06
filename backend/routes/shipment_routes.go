package routes

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"toolsProject/backend/handlers"
	"toolsProject/backend/middleware"
)

func RegisterShipmentRoutes(api *gin.RouterGroup, db *sql.DB) {
	api.GET("/shipments/:id", handlers.GetShipmentDetails(db))
	customer := api.Group("")
	customer.Use(middleware.RequireRole("customer"))
	customer.POST("/shipments", handlers.CreateShipment(db))
	customer.GET("/shipments", handlers.GetMyShipments(db))
	customer.POST("/shipments/:id/cancel", handlers.CancelShipment(db))
}

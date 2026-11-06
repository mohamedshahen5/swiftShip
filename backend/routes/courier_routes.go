package routes

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"toolsProject/backend/handlers"
	"toolsProject/backend/middleware"
)

// MEMBER 3: extend courier routes here. Do not edit main.go.
func RegisterCourierRoutes(api *gin.RouterGroup, db *sql.DB) {
	g := api.Group("/courier")
	g.Use(middleware.RequireRole("courier"))
	g.GET("/shipments", handlers.CourierShipments(db))
	g.POST("/shipments/:id/accept", handlers.CourierAccept(db))
	g.POST("/shipments/:id/decline", handlers.CourierDecline(db))
	g.PATCH("/shipments/:id/status", handlers.UpdateShipmentStatus(db))
}

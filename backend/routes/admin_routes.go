package routes

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"toolsProject/backend/handlers"
	"toolsProject/backend/middleware"
)

// MEMBER 4: extend admin routes here. Do not edit main.go.
func RegisterAdminRoutes(api *gin.RouterGroup, db *sql.DB) {
	g := api.Group("/admin")
	g.Use(middleware.RequireRole("admin"))
	g.GET("/shipments", handlers.AdminShipments(db))
	g.GET("/couriers", handlers.AdminCouriers(db))
	g.PATCH("/shipments/:id/assign", handlers.AssignShipment(db))
	g.PUT("/shipments/:id", handlers.AdminUpdateShipment(db))
	g.DELETE("/shipments/:id", handlers.AdminDeleteShipment(db))
	g.PATCH("/shipments/:id/status", handlers.UpdateShipmentStatus(db))
}

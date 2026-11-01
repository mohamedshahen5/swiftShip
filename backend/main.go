package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"toolsProject/backend/handlers"

	authMiddleware "toolsProject/backend/middleware"
)

func main() {
	ConnectDatabase()
	defer DB.Close()

	router := gin.Default()

	router.Use(func(c *gin.Context) {
    c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:4200")
    c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")

    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }

    c.Next()
})

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Delivery API is running",
		})
	})
	router.GET(
		"/api/track/:trackingNumber",
		handlers.TrackShipment(DB),
	)
	router.GET(
	"/api/track/:trackingNumber/history",
	handlers.GetShipmentHistory(DB),
)

	auth := router.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register(DB))
		auth.POST("/login", handlers.Login(DB))
	}

	protected := router.Group("/api")
	protected.Use(authMiddleware.AuthMiddleware())

	protected.GET("/me", func(c *gin.Context) {
		userID, exists := c.Get("userID")

		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "User not authenticated",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "You are authenticated",
			"userID":  userID,
		})
	})

	protected.POST("/shipments", handlers.CreateShipment(DB))
	protected.GET("/shipments", handlers.GetMyShipments(DB))
	protected.PATCH(
    "/shipments/:id/status",
    handlers.UpdateShipmentStatus(DB),
)

	if err := router.Run(":8080"); err != nil {
		panic(err)
	}
}

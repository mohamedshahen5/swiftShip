package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"toolsProject/backend/handlers"
	"toolsProject/backend/middleware"
	"toolsProject/backend/routes"
)

func main() {
	ConnectDatabase()
	defer DB.Close()
	router := gin.Default()
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:4200")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	router.GET("/api/health", func(c *gin.Context) { c.JSON(200, gin.H{"message": "Delivery API is running"}) })
	router.GET("/api/track/:trackingNumber", handlers.TrackShipment(DB))
	router.GET("/api/track/:trackingNumber/history", handlers.GetShipmentHistory(DB))
	auth := router.Group("/api/auth")
	auth.POST("/register", handlers.Register(DB))
	auth.POST("/login", handlers.Login(DB))
	api := router.Group("/api")
	api.Use(middleware.AuthMiddleware())
	api.GET("/me", func(c *gin.Context) {
		uid, _ := c.Get("userID")
		var name, phone, role string
		err := DB.QueryRow(`SELECT name,phone,role FROM users WHERE id=?`, uid).Scan(&name, &phone, &role)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "User no longer exists"})
			return
		}
		c.JSON(200, gin.H{"id": uid, "name": name, "phone": phone, "role": role})
	})
	routes.RegisterShipmentRoutes(api, DB)
	routes.RegisterCourierRoutes(api, DB)
	routes.RegisterAdminRoutes(api, DB)
	if err := router.Run(":8080"); err != nil {
		panic(err)
	}
}

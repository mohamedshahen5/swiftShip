package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint64 `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)

		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Authorization header must be Bearer <token>",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		secret := os.Getenv("JWT_SECRET")

		if secret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "JWT secret is not configured",
			})
			c.Abort()
			return
		}

		claims := &Claims{}

		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (interface{}, error) {
				// Accept only the expected signing algorithm.
				if token.Method != jwt.SigningMethodHS256 {
					return nil, jwt.ErrSignatureInvalid
				}

				return []byte(secret), nil
			},
		)

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Store the authenticated user's ID for later handlers.
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)

		c.Next()
	}
}
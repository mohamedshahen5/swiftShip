package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID uint64 `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`

	jwt.RegisteredClaims
}

func Login(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Invalid request body",
			})
			return
		}

		req.Email = strings.ToLower(strings.TrimSpace(req.Email))

		if req.Email == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Email and password are required",
			})
			return
		}

		var userID uint64
		var name string
		var email string
		var passwordHash string
		var phone, role string

		err := db.QueryRow(
			`SELECT id, name, email, phone, role, password_hash
			 FROM users
			 WHERE email = ?`,
			req.Email,
		).Scan(
			&userID,
			&name,
			&email,
			&phone,
			&role,
			&passwordHash,
		)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid email or password",
			})
			return
		}

		err = bcrypt.CompareHashAndPassword(
			[]byte(passwordHash),
			[]byte(req.Password),
		)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid email or password",
			})
			return
		}

		secret := os.Getenv("JWT_SECRET")

		if secret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "JWT secret is not configured",
			})
			return
		}

		claims := Claims{
			UserID: userID,
			Email:  email,
			Role:   role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(
					time.Now().Add(24 * time.Hour),
				),
				IssuedAt: jwt.NewNumericDate(time.Now()),
			},
		}

		token := jwt.NewWithClaims(
			jwt.SigningMethodHS256,
			claims,
		)

		tokenString, err := token.SignedString([]byte(secret))

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to generate token",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"token":   tokenString,
			"user": gin.H{
				"id":    userID,
				"name":  name,
				"email": email,
				"phone": phone,
				"role":  role,
			},
		})
	}
}

package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	mysqlDriver "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// Validation patterns
var (
	nameRegex = regexp.MustCompile(`^[\p{L}][\p{L}\p{M} '-]*$`)

	phoneRegex = regexp.MustCompile(`^(?:\+20|0)1[0125][0-9]{8}$`)
)

// Validate name
func isValidName(name string) bool {
	length := utf8.RuneCountInString(name)

	return length >= 3 &&
		length <= 100 &&
		nameRegex.MatchString(name)
}

// Validate email
func isValidEmail(email string) bool {
	if len(email) > 255 {
		return false
	}

	parsed, err := mail.ParseAddress(email)

	return err == nil && parsed.Address == email
}

// Validate Egyptian phone
func isValidPhone(phone string) bool {
	return phoneRegex.MatchString(phone)
}

// Validate password
func isValidPassword(password string) bool {
	if utf8.RuneCountInString(password) < 8 {
		return false
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true

		case unicode.IsLower(char):
			hasLower = true

		case unicode.IsDigit(char):
			hasDigit = true

		case !unicode.IsLetter(char) &&
			!unicode.IsNumber(char) &&
			!unicode.IsSpace(char):
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasDigit && hasSpecial
}

func Register(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req RegisterRequest

		// Parse JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Invalid request body",
			})
			return
		}

		// Normalize input
		req.Name = strings.TrimSpace(req.Name)
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		req.Phone = strings.TrimSpace(req.Phone)

		// Required fields
		if req.Name == "" || req.Email == "" ||
			req.Phone == "" || req.Password == "" {

			c.JSON(http.StatusBadRequest, gin.H{
				"message": "All fields are required",
			})
			return
		}

		// Name validation
		if !isValidName(req.Name) {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Name must be 3-100 characters and contain only letters, spaces, hyphens or apostrophes",
			})
			return
		}

		// Email validation
		if !isValidEmail(req.Email) {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Please enter a valid email address",
			})
			return
		}

		// Phone validation
		if !isValidPhone(req.Phone) {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Please enter a valid Egyptian mobile number",
			})
			return
		}

		// Password validation
		if !isValidPassword(req.Password) {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Password must contain at least 8 characters, uppercase, lowercase, number and special character",
			})
			return
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(req.Password),
			bcrypt.DefaultCost,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to hash password",
			})
			return
		}

		// Insert user into database
		result, err := db.Exec(
			`INSERT INTO users (name, email, phone, password_hash, role)
			 VALUES (?, ?, ?, ?, 'customer')`,
			req.Name,
			req.Email,
			req.Phone,
			string(hashedPassword),
		)

		if err != nil {
			var mysqlErr *mysqlDriver.MySQLError

			if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
				c.JSON(http.StatusConflict, gin.H{
					"message": "Email is already registered",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to create account",
			})
			return
		}

		userID, err := result.LastInsertId()

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to retrieve user ID",
			})
			return
		}

		// Success response
		c.JSON(http.StatusCreated, gin.H{
			"message": "User registered successfully",
			"user": gin.H{
				"id":    userID,
				"name":  req.Name,
				"email": req.Email,
				"phone": req.Phone,
			},
		})
	}
}

package handlers

import (
	"database/sql"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required"`
	Notes  string `json:"notes"`
}

func changeStatus(db *sql.DB, c *gin.Context, to, notes string, courier *uint64) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(400, gin.H{"message": "Invalid shipment id"})
		return
	}
	uid, role := CurrentUser(c)
	tx, err := db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"message": "Transaction failed"})
		return
	}
	defer tx.Rollback()
	err = ApplyStatusChange(tx, id, uid, role, to, notes, courier)
	if err != nil {
		code := http.StatusInternalServerError
		if errors.Is(err, ErrNotFound) {
			code = 404
		} else if errors.Is(err, ErrForbidden) {
			code = 403
		} else if errors.Is(err, ErrTransition) {
			code = 409
		}
		c.JSON(code, gin.H{"message": err.Error()})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"message": "Commit failed"})
		return
	}
	c.JSON(200, gin.H{"message": "Shipment updated", "status": to})
}
func UpdateShipmentStatus(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var r UpdateStatusRequest
		if c.ShouldBindJSON(&r) != nil {
			c.JSON(400, gin.H{"message": "Invalid status"})
			return
		}
		changeStatus(db, c, r.Status, r.Notes, nil)
	}
}
func CancelShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) { changeStatus(db, c, "cancelled", "Cancelled by customer", nil) }
}

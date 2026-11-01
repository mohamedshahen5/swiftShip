package handlers

import (
    "database/sql"
    "net/http"

    "github.com/gin-gonic/gin"
)

type UpdateStatusRequest struct {
    Status string `json:"status" binding:"required"`
    Notes  string `json:"notes"`
}

func UpdateShipmentStatus(db *sql.DB) gin.HandlerFunc {
    return func(c *gin.Context) {

        shipmentID := c.Param("id")

        var req UpdateStatusRequest

        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "message": "Invalid request",
            })
            return
        }

        // Validate the new status.
        allowedStatuses := map[string]bool{
            "picked_up": true,
            "in_transit": true,
            "delivered": true,
            "cancelled": true,
        }

        if !allowedStatuses[req.Status] {
            c.JSON(http.StatusBadRequest, gin.H{
                "message": "Invalid shipment status",
            })
            return
        }

        // Start a transaction.
        tx, err := db.Begin()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "message": "Could not start transaction",
            })
            return
        }
        defer tx.Rollback()

        // Get the current status and lock this shipment row.
        var oldStatus string

        err = tx.QueryRow(`
            SELECT status
            FROM shipments
            WHERE id = ?
            FOR UPDATE
        `, shipmentID).Scan(&oldStatus)

        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{
                "message": "Shipment not found",
            })
            return
        }

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "message": "Failed to retrieve shipment",
            })
            return
        }

        // Prevent invalid status transitions.
        validTransition := map[string][]string{
            "pending":   {"picked_up", "cancelled"},
            "picked_up": {"in_transit", "cancelled"},
            "in_transit": {"delivered"},
        }

        allowedNext := validTransition[oldStatus]
        valid := false

        for _, status := range allowedNext {
            if status == req.Status {
                valid = true
                break
            }
        }

        if !valid {
            c.JSON(http.StatusBadRequest, gin.H{
                "message": "This status transition is not allowed",
            })
            return
        }

        // Update shipment status.
        _, err = tx.Exec(`
            UPDATE shipments
            SET status = ?
            WHERE id = ?
        `, req.Status, shipmentID)

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "message": "Failed to update shipment status",
            })
            return
        }

        // Record status history.
        _, err = tx.Exec(`
            INSERT INTO shipment_history (
                shipment_id,
                old_status,
                new_status,
                notes
            )
            VALUES (?, ?, ?, ?)
        `, shipmentID, oldStatus, req.Status, req.Notes)

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "message": "Failed to save shipment history",
            })
            return
        }

        // Commit both database operations.
        if err := tx.Commit(); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "message": "Failed to save changes",
            })
            return
        }

        c.JSON(http.StatusOK, gin.H{
            "message": "Shipment status updated successfully",
            "old_status": oldStatus,
            "new_status": req.Status,
        })
    }
}
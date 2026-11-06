package handlers

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"math"
	"strconv"
	"strings"
	"time"
)

func AdminShipments(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		s, e := listShipments(db, "1=1")
		if e != nil {
			c.JSON(500, gin.H{"message": "Unable to fetch shipments"})
			return
		}
		c.JSON(200, gin.H{"count": len(s), "shipments": s})
	}
}
func AdminCouriers(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, e := db.Query(`SELECT id,name,phone FROM users WHERE role='courier' ORDER BY name`)
		if e != nil {
			c.JSON(500, gin.H{"message": "Failed to list couriers"})
			return
		}
		defer rows.Close()
		result := []gin.H{}
		for rows.Next() {
			var id uint64
			var name, phone string
			if rows.Scan(&id, &name, &phone) != nil {
				c.JSON(500, gin.H{"message": "Read error"})
				return
			}
			result = append(result, gin.H{"id": id, "name": name, "phone": phone})
		}
		if rows.Err() != nil {
			c.JSON(500, gin.H{"message": "Read error"})
			return
		}
		c.JSON(200, gin.H{"couriers": result})
	}
}
func AssignShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			CourierID uint64 `json:"courier_id"`
		}
		if c.ShouldBindJSON(&req) != nil || req.CourierID == 0 {
			c.JSON(400, gin.H{"message": "courier_id required"})
			return
		}
		changeStatus(db, c, "assigned", "Assigned by admin", &req.CourierID)
	}
}

// ---------------------------------------------------------------------------
// Admin edit / delete rules (member 4)
//
//   Edit   only while the order is pending or assigned, and only these fields:
//          receiver name/phone/address, pickup address, delivery time,
//          package description, delivery fee.
//          The status, customer, courier and sender can NOT be changed here.
//   Delete only while the order is pending or cancelled. Delivered and
//          in-progress orders are kept so history is never lost.
//          Deleting also removes the order's history rows (ON DELETE CASCADE).
// ---------------------------------------------------------------------------

type adminUpdateRequest struct {
	ReceiverName       string  `json:"receiver_name"`
	ReceiverPhone      string  `json:"receiver_phone"`
	ReceiverAddress    string  `json:"receiver_address"`
	PickupAddress      *string `json:"pickup_address"`
	DeliveryTime       *string `json:"delivery_time"`
	PackageDescription string  `json:"package_description"`
	DeliveryFee        float64 `json:"delivery_fee"`
}

// cleanAdminUpdate trims and validates the request. It returns the values to
// store for the nullable columns (nil = NULL) and a problem message ("" = ok).
func cleanAdminUpdate(r *adminUpdateRequest) (pickup, delivery interface{}, problem string) {
	r.ReceiverName = strings.TrimSpace(r.ReceiverName)
	r.ReceiverPhone = strings.TrimSpace(r.ReceiverPhone)
	r.ReceiverAddress = strings.TrimSpace(r.ReceiverAddress)
	r.PackageDescription = strings.TrimSpace(r.PackageDescription)

	if r.ReceiverName == "" || len(r.ReceiverName) > 100 ||
		r.ReceiverPhone == "" || len(r.ReceiverPhone) > 20 ||
		r.ReceiverAddress == "" || len(r.ReceiverAddress) > 2000 ||
		r.PackageDescription == "" || len(r.PackageDescription) > 255 {
		return nil, nil, "Invalid or oversized order fields"
	}
	if r.DeliveryFee < 0 || r.DeliveryFee > 99999999 ||
		math.IsNaN(r.DeliveryFee) || math.IsInf(r.DeliveryFee, 0) {
		return nil, nil, "Invalid delivery fee"
	}
	if r.PickupAddress != nil {
		v := strings.TrimSpace(*r.PickupAddress)
		if len(v) > 2000 {
			return nil, nil, "Pickup address too long"
		}
		if v != "" {
			pickup = v
		}
	}
	if r.DeliveryTime != nil {
		v := strings.TrimSpace(*r.DeliveryTime)
		if v != "" {
			if _, err := time.Parse("2006-01-02 15:04:05", v); err != nil {
				return nil, nil, "delivery_time must be YYYY-MM-DD HH:MM:SS"
			}
			delivery = v
		}
	}
	return pickup, delivery, ""
}

func AdminUpdateShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			c.JSON(400, gin.H{"message": "Invalid ID"})
			return
		}
		var r adminUpdateRequest
		if c.ShouldBindJSON(&r) != nil {
			c.JSON(400, gin.H{"message": "Invalid JSON"})
			return
		}
		pickup, delivery, problem := cleanAdminUpdate(&r)
		if problem != "" {
			c.JSON(400, gin.H{"message": problem})
			return
		}

		uid, _ := CurrentUser(c)
		tx, err := db.BeginTx(c.Request.Context(), nil)
		if err != nil {
			c.JSON(500, gin.H{"message": "Transaction failed"})
			return
		}
		defer tx.Rollback()

		var status string
		err = tx.QueryRow(`SELECT status FROM shipments WHERE id=? FOR UPDATE`, id).Scan(&status)
		if err == sql.ErrNoRows {
			c.JSON(404, gin.H{"message": "Shipment not found"})
			return
		}
		if err != nil {
			c.JSON(500, gin.H{"message": "Could not load shipment"})
			return
		}
		if status != "pending" && status != "assigned" {
			c.JSON(409, gin.H{"message": "Only pending or assigned orders can be edited"})
			return
		}

		_, err = tx.Exec(`UPDATE shipments SET receiver_name=?, receiver_phone=?, receiver_address=?, pickup_address=?, delivery_time=?, package_description=?, delivery_fee=? WHERE id=?`,
			r.ReceiverName, r.ReceiverPhone, r.ReceiverAddress, pickup, delivery, r.PackageDescription, r.DeliveryFee, id)
		if err != nil {
			c.JSON(500, gin.H{"message": "Update failed"})
			return
		}
		if err = RecordHistory(tx, id, status, status, "Order details edited by admin", uid); err != nil {
			c.JSON(500, gin.H{"message": "History failed"})
			return
		}
		if err = tx.Commit(); err != nil {
			c.JSON(500, gin.H{"message": "Commit failed"})
			return
		}
		c.JSON(200, gin.H{"message": "Order updated"})
	}
}

func AdminDeleteShipment(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			c.JSON(400, gin.H{"message": "Invalid ID"})
			return
		}

		tx, err := db.BeginTx(c.Request.Context(), nil)
		if err != nil {
			c.JSON(500, gin.H{"message": "Transaction failed"})
			return
		}
		defer tx.Rollback()

		var status string
		err = tx.QueryRow(`SELECT status FROM shipments WHERE id=? FOR UPDATE`, id).Scan(&status)
		if err == sql.ErrNoRows {
			c.JSON(404, gin.H{"message": "Shipment not found"})
			return
		}
		if err != nil {
			c.JSON(500, gin.H{"message": "Could not load shipment"})
			return
		}
		if status != "pending" && status != "cancelled" {
			c.JSON(409, gin.H{"message": "Only pending or cancelled orders can be deleted"})
			return
		}

		if _, err = tx.Exec(`DELETE FROM shipments WHERE id=?`, id); err != nil {
			c.JSON(500, gin.H{"message": "Delete failed"})
			return
		}
		if err = tx.Commit(); err != nil {
			c.JSON(500, gin.H{"message": "Commit failed"})
			return
		}
		c.JSON(200, gin.H{"message": "Order deleted"})
	}
}

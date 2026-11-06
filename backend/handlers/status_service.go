package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"toolsProject/backend/models"
)

var ErrNotFound = errors.New("shipment not found")
var ErrForbidden = errors.New("not authorized for this shipment or action")
var ErrTransition = errors.New("invalid status transition")

// RecordHistory and ApplyStatusChange must be used within the SAME transaction.
func RecordHistory(tx *sql.Tx, shipmentID uint64, oldStatus, newStatus, notes string, changedBy uint64) error {
	var old interface{} = oldStatus
	if oldStatus == "" {
		old = nil
	}
	_, err := tx.Exec(`INSERT INTO shipment_history(shipment_id,old_status,new_status,notes,changed_by) VALUES(?,?,?,?,?)`, shipmentID, old, newStatus, notes, changedBy)
	return err
}

// expectedCourier is used for admin assignment/reassignment. Nil means no reassignment.
// The shipment row is locked, permission + ownership enforced, history written atomically.
func ApplyStatusChange(tx *sql.Tx, shipmentID, userID uint64, role, to, notes string, expectedCourier *uint64) error {
	var old string
	var customer uint64
	var courier sql.NullInt64
	err := tx.QueryRow(`SELECT status,user_id,courier_id FROM shipments WHERE id=? FOR UPDATE`, shipmentID).Scan(&old, &customer, &courier)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if !models.CanTransition(old, to, role) {
		return ErrTransition
	}
	if role == "customer" && (customer != userID || to != models.Cancelled) {
		return ErrForbidden
	}
	if role == "courier" && (!courier.Valid || uint64(courier.Int64) != userID) {
		return ErrForbidden
	}
	if to == models.Assigned && role == "admin" {
		if expectedCourier == nil || *expectedCourier == 0 {
			return ErrForbidden
		}
		var r string
		if e := tx.QueryRow(`SELECT role FROM users WHERE id=?`, *expectedCourier).Scan(&r); e != nil {
    		if e == sql.ErrNoRows {
        		return ErrForbidden
    		}
    		return fmt.Errorf("courier lookup: %w", e)
        }
		if r != "courier" {
			return ErrForbidden
		}
		_, err = tx.Exec(`UPDATE shipments SET status=?,courier_id=? WHERE id=?`, to, *expectedCourier, shipmentID)
	} else if to == models.Pending && role == "courier" {
		_, err = tx.Exec(`UPDATE shipments SET status=?,courier_id=NULL WHERE id=?`, to, shipmentID)
	} else {
		_, err = tx.Exec(`UPDATE shipments SET status=? WHERE id=?`, to, shipmentID)
	}
	if err != nil {
		return err
	}
	return RecordHistory(tx, shipmentID, old, to, notes, userID)
}

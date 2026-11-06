package models

const (
	Pending   = "pending"
	Assigned  = "assigned"
	Accepted  = "accepted"
	PickedUp  = "picked_up"
	InTransit = "in_transit"
	Delivered = "delivered"
	Cancelled = "cancelled"
)

func CanTransition(from, to, role string) bool {
	if role == "admin" {
		if to == Cancelled && from != Delivered && from != Cancelled {
			return true
		}
		if to == Assigned && (from == Pending || from == Assigned || from == Accepted) {
			return true
		}
	}
	if role == "customer" {
		return from == Pending && to == Cancelled
	}
	if role == "courier" {
		switch from {
		case Assigned:
			return to == Accepted || to == Pending
		case Accepted:
			return to == PickedUp
		case PickedUp:
			return to == InTransit
		case InTransit:
			return to == Delivered
		}
	}
	return false
}

package models

import "testing"

func TestStatusTransitions(t *testing.T) {
	cases := []struct {
		from, to, role string
		want           bool
	}{
		{"pending", "assigned", "admin", true}, {"assigned", "accepted", "courier", true}, {"assigned", "pending", "courier", true}, {"accepted", "picked_up", "courier", true}, {"picked_up", "in_transit", "courier", true}, {"in_transit", "delivered", "courier", true}, {"pending", "cancelled", "customer", true}, {"assigned", "cancelled", "customer", false}, {"pending", "delivered", "courier", false}, {"delivered", "cancelled", "admin", false}, {"accepted", "assigned", "admin", true},
	}
	for _, c := range cases {
		if got := CanTransition(c.from, c.to, c.role); got != c.want {
			t.Errorf("%s -> %s as %s: got %t", c.from, c.to, c.role, got)
		}
	}
}

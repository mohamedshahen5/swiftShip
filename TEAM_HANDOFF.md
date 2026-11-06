# Work division

## Shared foundation — merge first
The new status state machine, history service, shared shipment query, JWT role, MySQL migrations, and Angular service/route skeleton are shared contract. **Do not independently rewrite these.**

## Member 3 — courier
- Turn the `CourierAssigned` placeholder into a list with accept, decline, picked-up, in-transit, delivered buttons.
- Add status-dependent buttons, loading states and confirmation on `ShipmentDetails` and customer cancellation for pending shipments.
- Use `CourierService` and `ShipmentService`, not raw HttpClient from page components.
- Current courier API routes already exist and implement transitions.

## Member 4 — admin
- Replace `AdminOrders` placeholder with sortable/filterable admin table and assignment/reassignment UI using `AdminService.couriers()` and `assign()`.
- Specify allowed edits and deletion policy **before** implementing the current 501 handlers. Use transactions and record administrative changes in history when status changes.
- Coordinate shared details-page UI edits with member 3 rather than editing the same component in parallel.

## Mandatory test cases
- Unauthenticated API returns 401; wrong role returns 403.
- Customer cannot cancel someone else's shipment, or cancel after assignment.
- Courier cannot see or advance another courier's shipment.
- Decline clears `courier_id`; admin reassigns `assigned` or `accepted`.
- Delivered/cancelled are terminal; invalid transition returns 409.
- History insert and status change either both commit or both roll back.
- Details and all lists use identical shipment JSON keys.

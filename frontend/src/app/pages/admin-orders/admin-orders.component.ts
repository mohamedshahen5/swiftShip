import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Shipment,
  ShipmentStatus,
  ShipmentUser,
  statusLabels
} from '../../models/shipment.model';
import { AdminService } from '../../services/admin.service';
import { StatusBadge } from '../../shared/status-badge/status-badge.component';

type SortKey = 'tracking_number' | 'customer' | 'status' | 'created_at';

interface EditForm {
  id: number;
  tracking_number: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  pickup_address: string;
  delivery_time: string; // value of a datetime-local input, e.g. 2026-12-10T09:15
  package_description: string;
  delivery_fee: number | null;
}

// Order used when sorting by status (follows the delivery lifecycle).
const STATUS_ORDER: ShipmentStatus[] = [
  'pending', 'assigned', 'accepted', 'picked_up',
  'in_transit', 'delivered', 'cancelled'
];

// MEMBER 4: Manage Orders page (features 9 and 10).
// Rules (also enforced by the backend):
//   assign/reassign: pending, assigned, accepted      cancel: not delivered/cancelled
//   edit:            pending, assigned                delete: pending, cancelled
@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadge],
  template: `
    <div class="admin-page">
      <h1>Manage Orders</h1>
      <p class="subtitle">
        View all orders, assign them to couriers, and reassign when needed.
      </p>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="message" class="success">{{ message }}</p>

      <div class="toolbar">
        <input
          type="text"
          class="search"
          placeholder="Search tracking number, customer, receiver or courier"
          [(ngModel)]="search">

        <select [(ngModel)]="statusFilter" class="filter">
          <option value="all">All statuses ({{ shipments.length }})</option>
          <option *ngFor="let st of statuses" [value]="st">
            {{ labels[st] }} ({{ countFor(st) }})
          </option>
        </select>

        <select [(ngModel)]="courierFilter" class="filter">
          <option [ngValue]="'all'">All couriers</option>
          <option [ngValue]="'none'">Unassigned ({{ countUnassigned() }})</option>
          <option *ngFor="let c of couriers" [ngValue]="c.id">
            {{ c.name }} ({{ countForCourier(c.id) }})
          </option>
        </select>

        <button
          *ngIf="filtersActive"
          class="btn light"
          (click)="clearFilters()">
          Clear filters
        </button>

        <button class="btn light" (click)="reload()" [disabled]="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <p *ngIf="loading && shipments.length === 0">Loading orders...</p>
      <p *ngIf="!loading && !error && shipments.length === 0">
        There are no orders yet.
      </p>
      <p *ngIf="shipments.length > 0 && visible.length === 0">
        No orders match your search or filter.
      </p>

      <div class="table-wrap" *ngIf="visible.length > 0">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="sortBy('tracking_number')">
                Tracking {{ arrow('tracking_number') }}
              </th>
              <th class="sortable" (click)="sortBy('customer')">
                Customer {{ arrow('customer') }}
              </th>
              <th>Receiver</th>
              <th>Courier</th>
              <th class="sortable" (click)="sortBy('status')">
                Status {{ arrow('status') }}
              </th>
              <th class="sortable" (click)="sortBy('created_at')">
                Created {{ arrow('created_at') }}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of visible">
              <td>
                <a [routerLink]="['/shipments', s.id]">{{ s.tracking_number }}</a>
              </td>
              <td>{{ s.customer.name }}</td>
              <td>{{ s.receiver_name }}</td>
              <td>
                <span *ngIf="s.courier">{{ s.courier.name }}</span>
                <span *ngIf="!s.courier" class="muted">Unassigned</span>
              </td>
              <td><app-status-badge [status]="s.status" /></td>
              <td>{{ s.created_at | date:'dd MMM yyyy, HH:mm':'UTC' }}</td>
              <td>
                <div class="actions">
                  <ng-container *ngIf="canAssign(s)">
                    <select
                      class="courier-select"
                      [(ngModel)]="selected[s.id]"
                      [disabled]="busyId === s.id">
                      <option [ngValue]="undefined">Choose courier...</option>
                      <option *ngFor="let c of couriers" [ngValue]="c.id">
                        {{ c.name }} ({{ workload(c.id) }} active)
                      </option>
                    </select>
                    <button
                      class="btn blue"
                      (click)="assign(s)"
                      [disabled]="!canSubmitAssign(s) || busyId === s.id">
                      {{ s.status === 'pending' ? 'Assign' : 'Reassign' }}
                    </button>
                  </ng-container>

                  <button
                    *ngIf="canCancel(s)"
                    class="btn red"
                    (click)="cancel(s)"
                    [disabled]="busyId === s.id">
                    Cancel
                  </button>

                  <button
                    *ngIf="canEdit(s)"
                    class="btn light"
                    (click)="openEdit(s)"
                    [disabled]="busyId === s.id">
                    Edit
                  </button>

                  <button
                    *ngIf="canDelete(s)"
                    class="btn dark"
                    (click)="remove(s)"
                    [disabled]="busyId === s.id">
                    Delete
                  </button>

                  <span
                    *ngIf="!canAssign(s) && !canCancel(s) && !canEdit(s) && !canDelete(s)"
                    class="muted">
                    No actions
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="overlay" *ngIf="editing" (click)="closeEdit()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>Edit order {{ editing.tracking_number }}</h2>
          <p class="hint">
            Only the receiver, pickup address, delivery time, description and fee
            can be changed.
          </p>
          <p *ngIf="editError" class="error">{{ editError }}</p>

          <label>Receiver name
            <input type="text" [(ngModel)]="editing.receiver_name">
          </label>
          <label>Receiver phone
            <input type="text" [(ngModel)]="editing.receiver_phone">
          </label>
          <label>Receiver address
            <textarea rows="2" [(ngModel)]="editing.receiver_address"></textarea>
          </label>
          <label>Pickup address
            <textarea rows="2" [(ngModel)]="editing.pickup_address"></textarea>
          </label>
          <label>Delivery time
            <input type="datetime-local" [(ngModel)]="editing.delivery_time">
          </label>
          <label>Package description
            <input type="text" [(ngModel)]="editing.package_description">
          </label>
          <label>Delivery fee (EGP)
            <input type="number" min="0" step="0.01" [(ngModel)]="editing.delivery_fee">
          </label>

          <div class="dialog-actions">
            <button class="btn light" (click)="closeEdit()" [disabled]="saving">
              Close
            </button>
            <button class="btn blue" (click)="saveEdit()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 24px; }
    .subtitle { color: #6b7280; margin-top: 4px; }
    .toolbar {
      display: flex; flex-wrap: wrap; gap: 10px;
      margin: 20px 0 16px;
    }
    .search {
      flex: 1 1 280px; padding: 10px 12px;
      border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;
    }
    .filter {
      padding: 10px 12px; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 14px; background: white;
    }
    .table-wrap {
      overflow-x: auto; background: white;
      border: 1px solid #e5e7eb; border-radius: 12px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td {
      padding: 12px 14px; text-align: left;
      border-bottom: 1px solid #f1f5f9; vertical-align: middle;
    }
    th { background: #f9fafb; font-size: 12px; color: #4b5563; white-space: nowrap; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { color: #111827; }
    tr:last-child td { border-bottom: none; }
    a { color: #2563eb; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .muted { color: #9ca3af; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .courier-select {
      padding: 8px 10px; border: 1px solid #d1d5db;
      border-radius: 7px; font-size: 13px; background: white; max-width: 190px;
    }
    .btn {
      padding: 8px 14px; border: none; border-radius: 7px;
      cursor: pointer; font-size: 13px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.light { background: #e5e7eb; color: #111827; }
    .btn.blue { background: #2563eb; color: white; }
    .btn.red { background: #dc2626; color: white; }
    .btn.dark { background: #374151; color: white; }
    .overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; z-index: 50;
    }
    .dialog {
      background: white; border-radius: 12px; padding: 24px;
      width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
    }
    .dialog h2 { margin: 0 0 4px; }
    .hint { color: #6b7280; font-size: 13px; margin: 0 0 14px; }
    .dialog label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 12px;
    }
    .dialog input, .dialog textarea {
      display: block; width: 100%; box-sizing: border-box; margin-top: 4px;
      padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 14px; font-family: inherit; font-weight: normal;
    }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .error { color: #dc2626; }
    .success { color: #15803d; }
  `]
})
export class AdminOrders implements OnInit {
  shipments: Shipment[] = [];
  couriers: ShipmentUser[] = [];

  loading = false;
  busyId: number | null = null;
  error = '';
  message = '';

  search = '';
  statusFilter: ShipmentStatus | 'all' = 'all';
  // 'all' = everyone, 'none' = unassigned orders, number = one courier's orders
  courierFilter: 'all' | 'none' | number = 'all';
  sortKey: SortKey = 'created_at';
  sortDir: 'asc' | 'desc' = 'desc';

  // The order being edited in the dialog (null = dialog closed).
  editing: EditForm | null = null;
  editError = '';
  saving = false;

  // Courier chosen in each row's dropdown, keyed by shipment id.
  selected: Record<number, number | undefined> = {};

  statuses = STATUS_ORDER;
  labels = statusLabels;

  constructor(private api: AdminService) {}

  ngOnInit(): void {
    this.loadCouriers();
    this.reload();
  }

  // ---------- loading ----------

  // keepMessages: true after an action, so its success/error text stays visible.
  reload(keepMessages = false): void {
    this.loading = true;
    if (!keepMessages) {
      this.error = '';
      this.message = '';
    }
    this.api.list().subscribe({
      next: (res) => {
        this.shipments = res.shipments;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Could not load orders';
      }
    });
  }

  private loadCouriers(): void {
    this.api.couriers().subscribe({
      next: (res) => (this.couriers = res.couriers),
      error: (err) =>
        (this.error = err.error?.message || 'Could not load couriers')
    });
  }

  // ---------- table data: filter + sort ----------

  get visible(): Shipment[] {
    const term = this.search.trim().toLowerCase();

    const filtered = this.shipments.filter((s) => {
      if (this.statusFilter !== 'all' && s.status !== this.statusFilter) {
        return false;
      }
      if (this.courierFilter === 'none' && s.courier) {
        return false;
      }
      if (
        typeof this.courierFilter === 'number' &&
        s.courier?.id !== this.courierFilter
      ) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [
        s.tracking_number,
        s.customer.name,
        s.receiver_name,
        s.courier?.name ?? ''
      ].some((text) => text.toLowerCase().includes(term));
    });

    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => dir * this.compare(a, b));
  }

  private compare(a: Shipment, b: Shipment): number {
    switch (this.sortKey) {
      case 'tracking_number':
        return a.tracking_number.localeCompare(b.tracking_number);
      case 'customer':
        return a.customer.name.localeCompare(b.customer.name);
      case 'status':
        return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      default:
        return a.created_at.localeCompare(b.created_at) || a.id - b.id;
    }
  }

  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  arrow(key: SortKey): string {
    if (this.sortKey !== key) {
      return '';
    }
    return this.sortDir === 'asc' ? '▲' : '▼';
  }

  get filtersActive(): boolean {
    return (
      this.search.trim() !== '' ||
      this.statusFilter !== 'all' ||
      this.courierFilter !== 'all'
    );
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.courierFilter = 'all';
  }

  // All orders ever given to this courier (any status).
  countForCourier(courierId: number): number {
    return this.shipments.filter((s) => s.courier?.id === courierId).length;
  }

  countUnassigned(): number {
    return this.shipments.filter((s) => !s.courier).length;
  }

  countFor(status: ShipmentStatus): number {
    return this.shipments.filter((s) => s.status === status).length;
  }

  // Active orders per courier, shown in the dropdown to help balance work.
  workload(courierId: number): number {
    const active: ShipmentStatus[] = [
      'assigned', 'accepted', 'picked_up', 'in_transit'
    ];
    return this.shipments.filter(
      (s) => s.courier?.id === courierId && active.includes(s.status)
    ).length;
  }

  // ---------- what each row may do (mirrors the backend rules) ----------

  canAssign(s: Shipment): boolean {
    return s.status === 'pending' || s.status === 'assigned' || s.status === 'accepted';
  }

  canCancel(s: Shipment): boolean {
    return s.status !== 'delivered' && s.status !== 'cancelled';
  }

  canEdit(s: Shipment): boolean {
    return s.status === 'pending' || s.status === 'assigned';
  }

  canDelete(s: Shipment): boolean {
    return s.status === 'pending' || s.status === 'cancelled';
  }

  canSubmitAssign(s: Shipment): boolean {
    const chosen = this.selected[s.id];
    return !!chosen && chosen !== s.courier?.id;
  }

  // ---------- actions ----------

  assign(s: Shipment): void {
    const courierId = this.selected[s.id];
    if (!courierId || !this.canSubmitAssign(s)) {
      return;
    }

    const courier = this.couriers.find((c) => c.id === courierId);
    const courierName = courier?.name ?? 'the selected courier';

    if (s.status === 'accepted') {
      const ok = window.confirm(
        `${s.courier?.name ?? 'The current courier'} already accepted ` +
        `${s.tracking_number}. Reassign it to ${courierName}?`
      );
      if (!ok) {
        return;
      }
    }

    this.runAction(
      s.id,
      this.api.assign(s.id, courierId),
      `${s.tracking_number} assigned to ${courierName}.`
    );
  }

  cancel(s: Shipment): void {
    const ok = window.confirm(
      `Cancel order ${s.tracking_number}? This cannot be undone.`
    );
    if (!ok) {
      return;
    }

    this.runAction(
      s.id,
      this.api.updateStatus(s.id, 'cancelled'),
      `${s.tracking_number} was cancelled.`
    );
  }

  remove(s: Shipment): void {
    const ok = window.confirm(
      `Delete order ${s.tracking_number} permanently? ` +
      'Its history will be removed too. This cannot be undone.'
    );
    if (!ok) {
      return;
    }

    this.runAction(
      s.id,
      this.api.delete(s.id),
      `${s.tracking_number} was deleted.`
    );
  }

  // ---------- edit dialog ----------

  openEdit(s: Shipment): void {
    this.editError = '';
    this.editing = {
      id: s.id,
      tracking_number: s.tracking_number,
      receiver_name: s.receiver_name,
      receiver_phone: s.receiver_phone,
      receiver_address: s.receiver_address,
      pickup_address: s.pickup_address ?? '',
      // "2026-12-10T09:15:00Z" -> "2026-12-10T09:15" (shown as stored, no shift)
      delivery_time: s.delivery_time ? s.delivery_time.slice(0, 16) : '',
      package_description: s.package_description,
      delivery_fee: Number(s.delivery_fee)
    };
  }

  closeEdit(): void {
    if (!this.saving) {
      this.editing = null;
    }
  }

  saveEdit(): void {
    const f = this.editing;
    if (!f) {
      return;
    }

    if (
      !f.receiver_name.trim() ||
      !f.receiver_phone.trim() ||
      !f.receiver_address.trim() ||
      !f.package_description.trim()
    ) {
      this.editError = 'Please fill in all required fields.';
      return;
    }
    if (f.delivery_fee === null || isNaN(Number(f.delivery_fee)) || Number(f.delivery_fee) < 0) {
      this.editError = 'Delivery fee must be 0 or more.';
      return;
    }

    const body = {
      receiver_name: f.receiver_name.trim(),
      receiver_phone: f.receiver_phone.trim(),
      receiver_address: f.receiver_address.trim(),
      pickup_address: f.pickup_address.trim() || null,
      // datetime-local gives "2026-12-10T09:15"; the API wants "2026-12-10 09:15:00"
      delivery_time: f.delivery_time ? f.delivery_time.replace('T', ' ') + ':00' : null,
      package_description: f.package_description.trim(),
      delivery_fee: Number(f.delivery_fee)
    };

    this.saving = true;
    this.editError = '';
    this.api.update(f.id, body).subscribe({
      next: () => {
        this.saving = false;
        this.editing = null;
        this.error = '';
        this.message = `${f.tracking_number} was updated.`;
        this.reload(true);
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 409) {
          this.editError =
            'This order can no longer be edited because its status changed. ' +
            'The list was refreshed.';
          this.reload(true);
        } else {
          this.editError = err.error?.message || 'Could not save the changes.';
        }
      }
    });
  }

  private runAction(
    id: number,
    request: ReturnType<AdminService['assign']>,
    successText: string
  ): void {
    this.busyId = id;
    this.error = '';
    this.message = '';

    request.subscribe({
      next: () => {
        this.busyId = null;
        delete this.selected[id];
        this.message = successText;
        this.reload(true);
      },
      error: (err) => {
        this.busyId = null;
        this.error =
          err.status === 409
            ? 'This order has changed since the page loaded. The list was refreshed.'
            : err.error?.message || 'The action failed. Please try again.';
        this.reload(true); // show the real current state
      }
    });
  }
}

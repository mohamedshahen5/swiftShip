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

const STATUS_ORDER: ShipmentStatus[] = [
  'pending', 'assigned', 'accepted', 'picked_up',
  'in_transit', 'delivered', 'cancelled'
];
const ACTIVE: ShipmentStatus[] = ['assigned', 'accepted', 'picked_up', 'in_transit'];

// Admin overview. Everything is calculated in the browser from the same
// data the Manage Orders page uses (GET /api/admin/shipments and /couriers).
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadge],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1>Admin Dashboard</h1>
          <p class="subtitle">A quick overview of all orders and couriers.</p>
        </div>
        <a routerLink="/admin/orders" class="btn blue link">Manage Orders →</a>
      </div>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="message" class="success">{{ message }}</p>
      <p *ngIf="loading">Loading...</p>

      <ng-container *ngIf="!loading">
        <div class="stats">
          <div class="stat">
            <span>Total orders</span>
            <h2>{{ total }}</h2>
          </div>
          <div class="stat warn">
            <span>Need a courier</span>
            <h2>{{ awaiting }}</h2>
            <small>Pending, not assigned yet</small>
          </div>
          <div class="stat">
            <span>In progress</span>
            <h2>{{ inProgress }}</h2>
            <small>{{ waitingAnswer }} waiting for a courier to accept</small>
          </div>
          <div class="stat ok">
            <span>Delivered</span>
            <h2>{{ delivered }}</h2>
            <small>{{ cancelled }} cancelled</small>
          </div>
        </div>

        <div class="grid">
          <section class="card">
            <h3>Needs a courier</h3>
            <p *ngIf="needsCourier.length === 0" class="muted">
              All orders have a courier. 🎉
            </p>
            <div class="row" *ngFor="let s of needsCourier">
              <div class="row-info">
                <a [routerLink]="['/shipments', s.id]">{{ s.tracking_number }}</a>
                <small>
                  {{ s.customer.name }} → {{ s.receiver_name }} ·
                  {{ s.created_at | date:'dd MMM, HH:mm':'UTC' }}
                </small>
              </div>
              <div class="row-actions">
                <select [(ngModel)]="selected[s.id]" [disabled]="busyId === s.id">
                  <option [ngValue]="undefined">Courier...</option>
                  <option *ngFor="let c of couriers" [ngValue]="c.id">
                    {{ c.name }} ({{ activeFor(c.id) }})
                  </option>
                </select>
                <button
                  class="btn blue"
                  (click)="assign(s)"
                  [disabled]="!selected[s.id] || busyId === s.id">
                  Assign
                </button>
              </div>
            </div>
            <a *ngIf="awaiting > needsCourier.length" routerLink="/admin/orders" class="more">
              See all {{ awaiting }} pending orders →
            </a>
          </section>

          <section class="card">
            <h3>Courier workload</h3>
            <p *ngIf="workload.length === 0" class="muted">No couriers found.</p>
            <div class="row" *ngFor="let w of workload">
              <div class="row-info">
                <strong>{{ w.courier.name }}</strong>
                <small>{{ w.courier.phone }}</small>
              </div>
              <span class="pill" [class.busy]="w.active >= 3">
                {{ w.active }} active
              </span>
            </div>
          </section>

          <section class="card">
            <h3>Orders by status</h3>
            <div class="bar-row" *ngFor="let b of breakdown">
              <span class="bar-label">{{ labels[b.status] }}</span>
              <div class="bar-track">
                <div class="bar-fill" [class]="'bar-fill ' + b.status"
                     [style.width.%]="b.percent"></div>
              </div>
              <span class="bar-count">{{ b.count }}</span>
            </div>
          </section>

          <section class="card">
            <h3>Latest orders</h3>
            <p *ngIf="recent.length === 0" class="muted">No orders yet.</p>
            <div class="row" *ngFor="let s of recent">
              <div class="row-info">
                <a [routerLink]="['/shipments', s.id]">{{ s.tracking_number }}</a>
                <small>
                  {{ s.customer.name }} ·
                  {{ s.courier ? s.courier.name : 'Unassigned' }}
                </small>
              </div>
              <app-status-badge [status]="s.status" />
            </div>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { padding: 24px; }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px;
    }
    h1 { margin: 0; }
    .subtitle { color: #6b7280; margin: 4px 0 0; }
    .stats {
      display: grid; gap: 14px; margin: 22px 0;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    }
    .stat {
      background: white; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 16px 18px;
    }
    .stat span { color: #6b7280; font-size: 13px; }
    .stat h2 { margin: 6px 0 2px; font-size: 30px; }
    .stat small { color: #9ca3af; font-size: 12px; }
    .stat.warn h2 { color: #b45309; }
    .stat.ok h2 { color: #15803d; }
    .grid {
      display: grid; gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    }
    .card {
      background: white; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 18px;
    }
    .card h3 { margin: 0 0 12px; font-size: 16px; }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px; padding: 10px 0; border-top: 1px solid #f1f5f9;
    }
    .row:first-of-type { border-top: none; }
    .row-info { display: flex; flex-direction: column; min-width: 0; }
    .row-info small { color: #6b7280; font-size: 12px; }
    .row-actions { display: flex; gap: 6px; align-items: center; }
    .row-actions select {
      padding: 7px 8px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 13px; background: white; max-width: 150px;
    }
    a { color: #2563eb; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    a.link { color: white; text-decoration: none; }
    .more { display: inline-block; margin-top: 10px; font-size: 13px; }
    .btn {
      padding: 8px 14px; border: none; border-radius: 7px;
      cursor: pointer; font-size: 13px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.blue { background: #2563eb; color: white; }
    .pill {
      background: #e0e7ff; color: #3730a3; border-radius: 14px;
      padding: 4px 10px; font-size: 12px; font-weight: 600; white-space: nowrap;
    }
    .pill.busy { background: #fee2e2; color: #991b1b; }
    .bar-row {
      display: grid; grid-template-columns: 90px 1fr 30px;
      gap: 10px; align-items: center; margin: 9px 0; font-size: 13px;
    }
    .bar-track { background: #f1f5f9; border-radius: 6px; height: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; background: #94a3b8; min-width: 2px; }
    .bar-fill.pending { background: #f59e0b; }
    .bar-fill.assigned { background: #3b82f6; }
    .bar-fill.accepted { background: #6366f1; }
    .bar-fill.picked_up { background: #10b981; }
    .bar-fill.in_transit { background: #06b6d4; }
    .bar-fill.delivered { background: #22c55e; }
    .bar-fill.cancelled { background: #ef4444; }
    .bar-count { text-align: right; color: #374151; font-weight: 600; }
    .muted { color: #9ca3af; }
    .error { color: #dc2626; }
    .success { color: #15803d; }
  `]
})
export class AdminDashboard implements OnInit {
  shipments: Shipment[] = [];
  couriers: ShipmentUser[] = [];

  loading = true;
  error = '';
  message = '';
  busyId: number | null = null;
  selected: Record<number, number | undefined> = {};

  total = 0;
  awaiting = 0;
  inProgress = 0;
  delivered = 0;
  cancelled = 0;
  waitingAnswer = 0;

  needsCourier: Shipment[] = [];
  recent: Shipment[] = [];
  workload: { courier: ShipmentUser; active: number }[] = [];
  breakdown: { status: ShipmentStatus; count: number; percent: number }[] = [];

  labels = statusLabels;

  constructor(private api: AdminService) {}

  ngOnInit(): void {
    this.api.couriers().subscribe({
      next: (res) => {
        this.couriers = res.couriers;
        this.compute();
      },
      error: (err) =>
        (this.error = err.error?.message || 'Could not load couriers')
    });
    this.load();
  }

  // keepMessages: true after an action, so its message stays visible.
  load(keepMessages = false): void {
    if (!keepMessages) {
      this.error = '';
      this.message = '';
    }
    this.api.list().subscribe({
      next: (res) => {
        this.shipments = res.shipments;
        this.loading = false;
        this.compute();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Could not load orders';
      }
    });
  }

  private count(...statuses: ShipmentStatus[]): number {
    return this.shipments.filter((s) => statuses.includes(s.status)).length;
  }

  private compute(): void {
    const list = this.shipments;

    this.total = list.length;
    this.awaiting = this.count('pending');
    this.inProgress = this.count(...ACTIVE);
    this.delivered = this.count('delivered');
    this.cancelled = this.count('cancelled');
    this.waitingAnswer = this.count('assigned');

    // Oldest pending orders first: they have been waiting the longest.
    this.needsCourier = list
      .filter((s) => s.status === 'pending')
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
      .slice(0, 5);

    this.recent = [...list]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .slice(0, 5);

    this.breakdown = STATUS_ORDER.map((status) => {
      const count = this.count(status);
      return {
        status,
        count,
        percent: this.total ? Math.round((count * 100) / this.total) : 0
      };
    });

    this.workload = this.couriers
      .map((courier) => ({
        courier,
        active: list.filter(
          (s) => s.courier?.id === courier.id && ACTIVE.includes(s.status)
        ).length
      }))
      .sort((a, b) => b.active - a.active || a.courier.name.localeCompare(b.courier.name));
  }

  activeFor(courierId: number): number {
    return this.workload.find((w) => w.courier.id === courierId)?.active ?? 0;
  }

  assign(s: Shipment): void {
    const courierId = this.selected[s.id];
    if (!courierId) {
      return;
    }
    const courierName =
      this.couriers.find((c) => c.id === courierId)?.name ?? 'the courier';

    this.busyId = s.id;
    this.error = '';
    this.message = '';

    this.api.assign(s.id, courierId).subscribe({
      next: () => {
        this.busyId = null;
        delete this.selected[s.id];
        this.message = `${s.tracking_number} assigned to ${courierName}.`;
        this.load(true);
      },
      error: (err) => {
        this.busyId = null;
        this.error =
          err.status === 409
            ? 'This order has changed since the page loaded. The list was refreshed.'
            : err.error?.message || 'Could not assign this order.';
        this.load(true);
      }
    });
  }
}

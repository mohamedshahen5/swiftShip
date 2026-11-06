
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Shipment } from '../../models/shipment.model';
import { ShipmentService } from '../../services/shipment.service';
import { AuthService } from '../../services/auth.service';
import { StatusBadge } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-shipment-details',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge],

  template: `
    <div class="details-page">

      <a routerLink="/my-shipments"
         *ngIf="auth.getRole() === 'customer'"
         class="back-link">
        ← Back to My Shipments
      </a>

      <a routerLink="/courier/assigned"
         *ngIf="auth.getRole() === 'courier'"
         class="back-link">
        ← Back to Assigned Shipments
      </a>

      <a routerLink="/admin/orders"
         *ngIf="auth.getRole() === 'admin'"
         class="back-link">
        ← Back to Orders
      </a>

      <h1>Shipment Details</h1>

      <p *ngIf="loading">Loading shipment details...</p>

      <p *ngIf="error" class="error">
        {{ error }}
      </p>

      <p *ngIf="successMessage" class="success">
        {{ successMessage }}
      </p>

      <div *ngIf="shipment as s" class="details-card">

        <div class="header">
          <div>
            <h2>{{ s.tracking_number }}</h2>
            <p class="subtitle">Shipment information</p>
          </div>

          <app-status-badge [status]="s.status" />
        </div>

        <div class="section">
          <h3>Sender Information</h3>

          <p><strong>Name:</strong> {{ s.sender_name }}</p>
          <p><strong>Phone:</strong> {{ s.sender_phone }}</p>
          <p><strong>Pickup Address:</strong>
            {{ s.pickup_address || 'Not specified' }}
          </p>
        </div>

        <div class="section">
          <h3>Receiver Information</h3>

          <p><strong>Name:</strong> {{ s.receiver_name }}</p>
          <p><strong>Phone:</strong> {{ s.receiver_phone }}</p>
          <p><strong>Delivery Address:</strong>
            {{ s.receiver_address }}
          </p>
        </div>

        <div class="section">
          <h3>Package Information</h3>

          <p><strong>Description:</strong>
            {{ s.package_description }}
          </p>

          <p><strong>Delivery Fee:</strong>
            {{ s.delivery_fee | number:'1.2-2' }} EGP
          </p>

          <p><strong>Requested Delivery Time:</strong>
            {{ s.delivery_time
              ? (s.delivery_time | date:'medium':'UTC')
              : 'Not specified' }}
          </p>
        </div>

        <div class="section">
          <h3>Courier Information</h3>

          <ng-container *ngIf="s.courier; else noCourier">
            <p><strong>Name:</strong> {{ s.courier.name }}</p>
            <p><strong>Phone:</strong> {{ s.courier.phone }}</p>
          </ng-container>

          <ng-template #noCourier>
            <p>No courier assigned yet.</p>
          </ng-template>
        </div>

        <div class="actions" *ngIf="canCancel()">

          <button
            class="cancel-btn"
            [disabled]="cancelling"
            (click)="cancelOrder()">

            {{ cancelling ? 'Cancelling...' : 'Cancel Order' }}

          </button>

        </div>

      </div>

    </div>
  `,

  styles: [`
    .details-page {
      padding: 24px;
      max-width: 950px;
      margin: auto;
    }

    h1 {
      margin-bottom: 24px;
      color: #17243b;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 18px;
      color: #2563eb;
      text-decoration: none;
      font-size: 14px;
    }

    .details-card {
      background: white;
      padding: 28px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }

    .header h2 {
      margin: 0;
      color: #17243b;
    }

    .subtitle {
      color: #6b7280;
      margin-top: 6px;
    }

    .section {
      padding: 18px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .section h3 {
      color: #1e3a5f;
      margin-bottom: 15px;
    }

    .section p {
      margin: 10px 0;
      color: #374151;
      line-height: 1.6;
    }

    .actions {
      margin-top: 24px;
    }

    .cancel-btn {
      background: #dc2626;
      color: white;
      border: none;
      padding: 12px 22px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    .cancel-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error {
      color: #dc2626;
      margin-bottom: 16px;
    }

    .success {
      color: #15803d;
      margin-bottom: 16px;
    }
  `]
})

export class ShipmentDetails implements OnInit {

  shipment: Shipment | null = null;

  loading = false;
  cancelling = false;

  error = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private shipmentService: ShipmentService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadShipment();
  }

  loadShipment(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'Invalid shipment ID';
      return;
    }

    this.loading = true;
    this.error = '';

    this.shipmentService.getById(id).subscribe({
      next: (response) => {
        this.shipment = response;
        this.loading = false;
      },

      error: (err) => {
        this.shipment = null;
        this.error =
          err.error?.message || 'Failed to load shipment details';
        this.loading = false;
      }
    });
  }

  canCancel(): boolean {
    const user = this.auth.getUser();

    return (
      user?.role === 'customer' &&
      this.shipment?.customer.id === user.id &&
      this.shipment?.status === 'pending'
    );
  }

  cancelOrder(): void {
    if (!this.shipment || !this.canCancel() || this.cancelling) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this shipment?'
    );

    if (!confirmed) {
      return;
    }

    this.cancelling = true;
    this.error = '';
    this.successMessage = '';

    this.shipmentService.cancel(this.shipment.id).subscribe({
      next: () => {
        this.cancelling = false;
        this.successMessage = 'Shipment cancelled successfully!';
        this.loadShipment();
      },

      error: (err) => {
        this.cancelling = false;
        this.error =
          err.error?.message || 'Failed to cancel shipment';

        this.loadShipment();
      }
    });
  }
}

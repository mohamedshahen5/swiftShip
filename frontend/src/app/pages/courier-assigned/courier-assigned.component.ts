
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Shipment,
  ShipmentStatus
} from '../../models/shipment.model';

import { CourierService } from '../../services/courier.service';

import { StatusBadge } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-courier-assigned',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge],
  template: `
    <div class="courier-page">

      <h1>My Assigned Shipments</h1>
      <p>Manage your assigned deliveries</p>

      <p *ngIf="loading">Loading shipments...</p>

      <p *ngIf="error" class="error">
        {{ error }}
      </p>

      <p *ngIf="successMessage" class="success">
        {{ successMessage }}
      </p>

      <p *ngIf="!loading && !error && shipments.length === 0">
        No assigned shipments found.
      </p>

      <div class="shipment-card" *ngFor="let shipment of shipments">

        <div class="card-header">
          <h3>{{ shipment.tracking_number }}</h3>

          <app-status-badge
            [status]="shipment.status">
          </app-status-badge>
        </div>

        <p><strong>Pickup:</strong>
          {{ shipment.pickup_address || 'Not specified' }}
        </p>

        <p><strong>Delivery:</strong>
          {{ shipment.receiver_address }}
        </p>

        <p><strong>Receiver:</strong>
          {{ shipment.receiver_name }}
        </p>

        <p><strong>Package:</strong>
          {{ shipment.package_description }}
        </p>

        <div class="actions">

          <a
            class="details-btn"
            [routerLink]="['/shipments', shipment.id]">
            View Details
          </a>

          <ng-container *ngIf="shipment.status === 'assigned'">

            <button
              class="accept-btn"
              [disabled]="busyId === shipment.id"
              (click)="acceptOrder(shipment.id)">
              Accept
            </button>

            <button
              class="decline-btn"
              [disabled]="busyId === shipment.id"
              (click)="declineOrder(shipment.id)">
              Decline
            </button>

          </ng-container>

          <button
            *ngIf="shipment.status === 'accepted'"
            class="update-btn"
            [disabled]="busyId === shipment.id"
            (click)="updateStatus(shipment.id, 'picked_up')">
            Picked Up
          </button>

          <button
            *ngIf="shipment.status === 'picked_up'"
            class="update-btn"
            [disabled]="busyId === shipment.id"
            (click)="updateStatus(shipment.id, 'in_transit')">
            In Transit
          </button>

          <button
            *ngIf="shipment.status === 'in_transit'"
            class="update-btn"
            [disabled]="busyId === shipment.id"
            (click)="updateStatus(shipment.id, 'delivered')">
            Delivered
          </button>

        </div>

      </div>

    </div>
  `,
  styles: [`
    .courier-page {
      padding: 24px;
    }

    .shipment-card {
      background: white;
      padding: 20px;
      margin-top: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    button, .details-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 7px;
      cursor: pointer;
      font-size: 13px;
      text-decoration: none;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .details-btn {
      background: #e5e7eb;
      color: #111827;
    }

    .accept-btn {
      background: #16a34a;
      color: white;
    }

    .decline-btn {
      background: #dc2626;
      color: white;
    }

    .update-btn {
      background: #2563eb;
      color: white;
    }

    .error {
      color: #dc2626;
    }

    .success {
      color: #15803d;
    }
  `]
})
export class CourierAssigned implements OnInit {

  shipments: Shipment[] = [];

  loading = false;
  error = '';
  successMessage = '';
  busyId: number | null = null;

  constructor(private courierService: CourierService) {}

  ngOnInit(): void {
    this.loadShipments();
  }

  loadShipments(): void {
    this.loading = true;
    this.error = '';

    this.courierService.list().subscribe({
      next: (response) => {
        this.shipments = response.shipments;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load shipments';
        this.loading = false;
      }
    });
  }

  acceptOrder(id: number): void {
    if (this.busyId !== null) return;

    this.busyId = id;
    this.error = '';
    this.successMessage = '';

    this.courierService.accept(id).subscribe({
      next: () => {
        this.busyId = null;
        this.successMessage = 'Shipment accepted successfully!';
        this.loadShipments();
      },
      error: (err) => {
        this.busyId = null;
        this.error = err.error?.message || 'Failed to accept shipment';
      }
    });
  }

  declineOrder(id: number): void {
    if (this.busyId !== null) return;

    const confirmed = confirm(
      'Are you sure you want to decline this shipment?'
    );

    if (!confirmed) return;

    this.busyId = id;
    this.error = '';
    this.successMessage = '';

    this.courierService.decline(id).subscribe({
      next: () => {
        this.busyId = null;
        this.successMessage = 'Shipment declined successfully!';
        this.loadShipments();
      },
      error: (err) => {
        this.busyId = null;
        this.error = err.error?.message || 'Failed to decline shipment';
      }
    });
  }

  updateStatus(id: number, status: ShipmentStatus): void {
    if (this.busyId !== null) return;

    this.busyId = id;
    this.error = '';
    this.successMessage = '';

    this.courierService.updateStatus(id, status).subscribe({
      next: () => {
        this.busyId = null;
        this.successMessage = 'Shipment status updated successfully!';
        this.loadShipments();
      },
      error: (err) => {
        this.busyId = null;
        this.error = err.error?.message || 'Failed to update status';
      }
    });
  }
}

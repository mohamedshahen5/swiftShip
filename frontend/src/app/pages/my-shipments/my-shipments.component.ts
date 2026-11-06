import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShipmentService } from '../../services/shipment.service';
import { Shipment } from '../../models/shipment.model';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-my-shipments',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge],
  templateUrl: './my-shipments.component.html',
  styleUrl: './my-shipments.component.css'
})
export class MyShipments implements OnInit {

  shipments: Shipment[] = [];
  loading = false;
  errorMessage = '';

  constructor(private shipmentService: ShipmentService) {}

  ngOnInit(): void {
    this.loadShipments();
  }

  loadShipments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.shipmentService.mine().subscribe({
      next: (response) => {
        this.shipments = response.shipments;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load shipments:', error);

        this.errorMessage =
          error.error?.message || 'Failed to load your shipments.';

        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }
}
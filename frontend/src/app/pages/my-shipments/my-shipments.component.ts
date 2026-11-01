import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Shipment } from '../../services/auth.service';

@Component({
  selector: 'app-my-shipments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-shipments.component.html',
  styleUrl: './my-shipments.component.css'
})
export class MyShipments implements OnInit {

  shipments: Shipment[] = [];
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadShipments();
  }

  loadShipments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.getMyShipments().subscribe({
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
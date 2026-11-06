import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ShipmentService } from '../../services/shipment.service';
import { Shipment } from '../../models/shipment.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private shipmentService = inject(ShipmentService);

  isCustomer = this.auth.getRole() === 'customer';
  loading = false;
  total = 0;
  pending = 0;
  inTransit = 0;
  delivered = 0;

  ngOnInit(): void {
    if (this.isCustomer) {
      this.loadStats();
    }
  }

  loadStats(): void {
    this.loading = true;
    this.shipmentService.mine().subscribe({
      next: (res) => {
        const shipments: Shipment[] = res.shipments || [];
        this.total = shipments.length;
        this.pending = shipments.filter(s => s.status === 'pending' || s.status === 'assigned' || s.status === 'accepted').length;
        this.inTransit = shipments.filter(s => s.status === 'picked_up' || s.status === 'in_transit').length;
        this.delivered = shipments.filter(s => s.status === 'delivered').length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

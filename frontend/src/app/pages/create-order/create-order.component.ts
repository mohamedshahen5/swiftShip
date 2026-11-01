import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.css'
})
export class CreateOrder {

  orderForm: FormGroup;
  successMessage = '';
  errorMessage = '';
  loading = false;
  trackingNumber = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.orderForm = this.fb.group({
      senderName: ['', Validators.required],
      senderPhone: ['', Validators.required],
      receiverName: ['', Validators.required],
      receiverPhone: ['', Validators.required],
      receiverAddress: ['', Validators.required],
      packageDescription: ['', Validators.required],
      deliveryFee: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit(): void {
  this.successMessage = '';
  this.errorMessage = '';

  if (this.orderForm.invalid) {
    this.orderForm.markAllAsTouched();
    return;
  }

  this.loading = true;

  const formValue = this.orderForm.value;

  const shipmentData = {
    sender_name: formValue.senderName,
    sender_phone: formValue.senderPhone,
    receiver_name: formValue.receiverName,
    receiver_phone: formValue.receiverPhone,
    receiver_address: formValue.receiverAddress,
    package_description: formValue.packageDescription,
    delivery_fee: Number(formValue.deliveryFee)
  };

  this.authService.createShipment(shipmentData).subscribe({
    next: (response) => {
      this.successMessage = response.message;
      this.trackingNumber = response.tracking_number;

      this.orderForm.reset({
        deliveryFee: 0
      });

      this.loading = false;
    },

    error: (error) => {
      console.log('Shipment error:', error);

      this.errorMessage =
        error.error?.message || 'Failed to create shipment';

      this.loading = false;
    }
  });
}
}
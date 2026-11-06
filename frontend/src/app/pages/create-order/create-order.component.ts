import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ShipmentService } from '../../services/shipment.service';

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
    private shipmentService: ShipmentService
  ) {
    this.orderForm = this.fb.group({
      senderName: ['', [Validators.required, Validators.maxLength(100)]],
      senderPhone: ['', [Validators.required, Validators.maxLength(20)]],
      receiverName: ['', [Validators.required, Validators.maxLength(100)]],
      receiverPhone: ['', [Validators.required, Validators.maxLength(20)]],
      receiverAddress: ['', [Validators.required, Validators.maxLength(2000)]],
      packageDescription: ['', [Validators.required, Validators.maxLength(255)]],
      pickupAddress: ['', Validators.maxLength(2000)],
      deliveryTime: [''],
      deliveryFee: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit(): void {
  this.successMessage = '';
  this.errorMessage = '';

  if (this.orderForm.invalid) {
    this.orderForm.markAllAsTouched();
    this.errorMessage = "Please complete all required fields correctly.";
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
    pickup_address: formValue.pickupAddress || null,
    delivery_time: formValue.deliveryTime ? formValue.deliveryTime.replace("T"," ") + ":00" : null,
    package_description: formValue.packageDescription,
    delivery_fee: Number(formValue.deliveryFee)
  };

  this.shipmentService.create(shipmentData).subscribe({
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
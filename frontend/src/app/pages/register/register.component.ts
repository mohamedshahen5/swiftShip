
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class Register {

  registerForm: FormGroup;
  successMessage = '';
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
   
this.registerForm = this.fb.group({
  name: [
    '',
    [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100),
      Validators.pattern(/^[\p{L}][\p{L}\s'-]*$/u)
    ]
  ],

  email: [
    '',
    [
      Validators.required,
      Validators.email,
      Validators.maxLength(255)
    ]
  ],

  phone: [
    '',
    [
      Validators.required,
      Validators.pattern(/^(?:\+20|0)1[0125][0-9]{8}$/)
    ]
  ],

  password: [
    '',
    [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/
      )
    ]
  ]
});

  }

  onSubmit(): void {

    this.successMessage = '';
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Account created successfully!';
        this.registerForm.reset();
        this.loading = false;
      },

      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Registration failed. Please try again.';

        this.loading = false;
      }
    });
  }
}

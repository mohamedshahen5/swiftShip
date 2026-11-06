
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { roleHome } from '../../models/shipment.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class Login {

  loginForm: FormGroup;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]],

      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]]
    });
  }

  onSubmit(): void {

    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.login(this.loginForm.value).subscribe({

      next: (response) => {

        // Save JWT token
        localStorage.setItem('token', response.token);

        // Save user information
        localStorage.setItem(
          'user',
          JSON.stringify(response.user)
        );

        this.loading = false;

        // Temporary success message until we build My Orders
        this.errorMessage = '';
        this.router.navigateByUrl(roleHome(response.user.role));

      },

      error: (error) => {

        this.errorMessage =
          error.error?.message || 'Invalid email or password';

        this.loading = false;
      }

    });
  }
}

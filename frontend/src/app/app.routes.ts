import { Routes } from '@angular/router';

import { Login } from './pages/login/login.component';
import { Register } from './pages/register/register.component';
import { Dashboard } from './pages/dashboard/dashboard.component';
import { CreateOrder } from './pages/create-order/create-order.component';
import { MyShipments } from './pages/my-shipments/my-shipments.component';

import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout.component';

import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [

  // Public pages
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard]
  },

  // Protected application pages
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'create-order',
        component: CreateOrder
      },
      {
        path: 'my-shipments',
        component: MyShipments
      },
      {
        path: 'track',
        component: Dashboard
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Unknown URLs
  {
    path: '**',
    redirectTo: ''
  }
];
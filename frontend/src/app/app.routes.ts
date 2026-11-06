import {Routes} from '@angular/router';import {Login} from './pages/login/login.component';import {Register} from './pages/register/register.component';import {Dashboard} from './pages/dashboard/dashboard.component';import {CreateOrder} from './pages/create-order/create-order.component';import {MyShipments} from './pages/my-shipments/my-shipments.component';import {ShipmentDetails} from './pages/shipment-details/shipment-details.component';import {CourierAssigned} from './pages/courier-assigned/courier-assigned.component';import {AdminOrders} from './pages/admin-orders/admin-orders.component';import {AdminDashboard} from './pages/admin-dashboard/admin-dashboard.component';import {DashboardLayout} from './layouts/dashboard-layout/dashboard-layout.component';import {authGuard} from './guards/auth.guard';import {guestGuard} from './guards/guest.guard';import {roleGuard} from './guards/role.guard';
export const routes:Routes=[{path:'login',component:Login,canActivate:[guestGuard]},{path:'register',component:Register,canActivate:[guestGuard]},{path:'',component:DashboardLayout,canActivate:[authGuard],children:[
 {path:'dashboard',component:Dashboard,canActivate:[roleGuard],data:{roles:['customer']}},
 {path:'create-order',component:CreateOrder,canActivate:[roleGuard],data:{roles:['customer']}},
 {path:'my-shipments',component:MyShipments,canActivate:[roleGuard],data:{roles:['customer']}},
 {path:'shipments/:id',component:ShipmentDetails},
 {path:'courier/assigned',component:CourierAssigned,canActivate:[roleGuard],data:{roles:['courier']}},
 {path:'admin/dashboard',component:AdminDashboard,canActivate:[roleGuard],data:{roles:['admin']}},
 {path:'admin/orders',component:AdminOrders,canActivate:[roleGuard],data:{roles:['admin']}}
 ]},{path:'**',redirectTo:'login'}];

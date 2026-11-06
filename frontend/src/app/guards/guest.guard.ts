import {inject} from '@angular/core';import {CanActivateFn,Router} from '@angular/router';import {AuthService} from '../services/auth.service';import {roleHome} from '../models/shipment.model';
export const guestGuard:CanActivateFn=()=>{const auth=inject(AuthService);return !auth.isLoggedIn()?true:inject(Router).createUrlTree([roleHome(auth.getRole())])};


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}
export interface CreateShipmentRequest {
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_description: string;
  delivery_fee: number;
}
export interface CreateShipmentResponse {
  message: string;
  id: number;
  tracking_number: string;
  status: string;
}
export interface Shipment {
  id: number;
  tracking_number: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_description: string;
  delivery_fee: number;
  status: string;
  created_at: string;
}

export interface MyShipmentsResponse {
  count: number;
  shipments: Shipment[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/register`,
      data
    );
  }
  
login(data: LoginRequest): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(
    `${this.apiUrl}/login`,
    data
  );
}
createShipment(
  data: CreateShipmentRequest
): Observable<CreateShipmentResponse> {
  return this.http.post<CreateShipmentResponse>(
    'http://localhost:8080/api/shipments',
    data
  );
}
getMyShipments(): Observable<MyShipmentsResponse> {
  return this.http.get<MyShipmentsResponse>(
    'http://localhost:8080/api/shipments'
  );
}

}

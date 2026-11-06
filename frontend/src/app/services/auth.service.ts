import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Role } from '../models/shipment.model';
export interface AppUser {id:number;name:string;email:string;phone:string;role:Role}
export interface RegisterRequest {name:string;email:string;phone:string;password:string}
export interface RegisterResponse {message:string;user:AppUser}
export interface LoginRequest {email:string;password:string}
export interface LoginResponse {message:string;token:string;user:AppUser}
@Injectable({providedIn:'root'})
export class AuthService {
 private apiUrl = `${environment.apiUrl}/auth`;
 constructor(private http:HttpClient){}
 register(data:RegisterRequest):Observable<RegisterResponse>{return this.http.post<RegisterResponse>(`${this.apiUrl}/register`,data)}
 login(data:LoginRequest):Observable<LoginResponse>{return this.http.post<LoginResponse>(`${this.apiUrl}/login`,data)}
 getUser():AppUser|null{try{return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}}
 getRole():Role|null{return this.getUser()?.role??null}
 isLoggedIn():boolean{return !!localStorage.getItem('token')}
 logout():void{localStorage.removeItem('token');localStorage.removeItem('user')}
}

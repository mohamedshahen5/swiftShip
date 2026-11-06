export type Role = 'customer' | 'courier' | 'admin';
export type ShipmentStatus = 'pending' | 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export const statusLabels: Record<ShipmentStatus, string> = {pending:'Pending',assigned:'Assigned',accepted:'Accepted',picked_up:'Picked up',in_transit:'In transit',delivered:'Delivered',cancelled:'Cancelled'};
export interface ShipmentUser { id:number; name:string; phone:string }
export interface Shipment { id:number;tracking_number:string;status:ShipmentStatus;created_at:string;updated_at:string;sender_name:string;sender_phone:string;pickup_address:string|null;receiver_name:string;receiver_phone:string;receiver_address:string;delivery_time:string|null;package_description:string;delivery_fee:number;customer:ShipmentUser;courier:ShipmentUser|null }
export interface CreateShipmentRequest {sender_name:string;sender_phone:string;pickup_address:string|null;receiver_name:string;receiver_phone:string;receiver_address:string;delivery_time:string|null;package_description:string;delivery_fee:number}
export interface CreateShipmentResponse {message:string;id:number;tracking_number:string;status:ShipmentStatus}
export interface ShipmentList { count:number; shipments:Shipment[] }
export const roleHome = (role: Role | null): string => role==='admin'?'/admin/dashboard':role==='courier'?'/courier/assigned':'/my-shipments';

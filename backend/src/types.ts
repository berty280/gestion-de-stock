export type Role = 'OPERATOR' | 'ADMIN' | 'SUPERVISOR';
export type Location = 'VITRINE' | 'STOCK';
export type MovementType = 'RECEPTION' | 'REAPPRO' | 'VENTE' | 'AJUSTEMENT';
export type ProductSource = 'api' | 'manuel';
export type AlertType = 'VITRINE_LOW' | 'STOCK_LOW';
export type AlertStatus = 'OUVERTE' | 'RESOLUE';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  active: number;
  created_at: string;
}

export interface ProductRow {
  id: number;
  gtin: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  unit: string | null;
  mini_vitrine: number;
  mini_stock: number;
  source: ProductSource;
  created_at: string;
}

export interface MovementRow {
  id: number;
  product_id: number;
  type: MovementType;
  quantity: number;
  from_location: Location | null;
  to_location: Location | null;
  user_id: number;
  sale_id: number | null;
  scan_uid: string | null;
  created_at: string;
}

export interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  unknown: number;
  created_at: string;
}

export interface SaleRow {
  id: number;
  customer_id: number | null;
  user_id: number;
  created_at: string;
}

export interface AlertRow {
  id: number;
  product_id: number;
  type: AlertType;
  status: AlertStatus;
  email_sent: number;
  created_at: string;
  resolved_at: string | null;
}

export interface JwtUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

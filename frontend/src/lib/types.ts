export type Role = 'OPERATOR' | 'ADMIN' | 'SUPERVISOR';
export type Location = 'VITRINE' | 'STOCK';
export type MovementType = 'RECEPTION' | 'REAPPRO' | 'VENTE' | 'AJUSTEMENT';
export type AlertType = 'VITRINE_LOW' | 'STOCK_LOW';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  gtin: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  unit: string | null;
  mini_vitrine: number;
  mini_stock: number;
  source: 'api' | 'manuel';
  created_at: string;
  vitrine: number;
  stock: number;
}

export interface ProductSuggestion {
  gtin: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  source: 'api';
}

export type LookupResult =
  | { source: 'local'; product: Product }
  | { source: 'api'; suggestion: ProductSuggestion }
  | { source: 'none'; gtin: string };

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  unknown: number;
  created_at: string;
}

export interface Alert {
  id: number;
  product_id: number;
  type: AlertType;
  status: 'OUVERTE' | 'RESOLUE';
  email_sent: number;
  created_at: string;
  resolved_at: string | null;
  product_name: string;
  product_brand: string | null;
  mini_vitrine: number;
  mini_stock: number;
  vitrine: number | null;
  stock: number | null;
}

export interface AlertCount {
  vitrine_low: number;
  stock_low: number;
  total: number;
}

export interface StockRow {
  id: number;
  gtin: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  mini_vitrine: number;
  mini_stock: number;
  vitrine: number;
  stock: number;
  vitrine_low: boolean;
  stock_low: boolean;
}

export interface MovementRow {
  id: number;
  type: MovementType;
  quantity: number;
  from_location: Location | null;
  to_location: Location | null;
  sale_id: number | null;
  created_at: string;
  product_name: string;
  user_name: string | null;
}

export interface ReceiptLine {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  brand: string | null;
  unit: string | null;
  gtin: string | null;
}

export interface Receipt {
  sale: { id: number; customer_id: number | null; user_id: number; created_at: string };
  customer: { name: string; phone: string | null; unknown?: number };
  seller: string | null;
  lines: ReceiptLine[];
  total_items: number;
}

export interface SalesReport {
  date: string;
  sales_count: number;
  items_sold: number;
  sales: Array<{
    id: number;
    created_at: string;
    seller: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    total_items: number;
  }>;
}

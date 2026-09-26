export type Category = 'Sabores' | 'Sabores 1' | 'Sabores 2' | 'Sabores 3' | 'Sabores Especiais' | 'Sabores Premium' | 'Outros';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoria: Category;
  image: string;
  imagePath?: string;
  available: boolean;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface LoyaltyTier {
  id: 'bronze' | 'prata' | 'ouro' | 'diamante';
  name: string;
  benefits: string[];
  minOrders: number;
  color: string;
}

export type OrderStatus = 'new' | 'production' | 'delivery' | 'finished' | 'cancelled';

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  address: string;
  items: CartItem[];
  total: number;
  deliveryType: 'delivery' | 'pickup';
  deliveryFee: number;
  paymentMethod: 'pix' | 'card' | 'cash';
  timestamp: number;
  status: OrderStatus;
}

export interface Feedback {
  id: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number; // percentage or fixed
  type: 'percentage' | 'fixed';
  minOrderValue: number;
  validUntil: number;
  active: boolean;
}

export interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
}

export interface StoreConfig {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  address: string;
  workingHours: string;
  pixKey: string;
  deliveryFeeDefault: number;
  isOpen?: boolean;
}

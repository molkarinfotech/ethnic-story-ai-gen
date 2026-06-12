export type ProductCategory = 'saree' | 'lehenga' | 'kurta' | 'kids';

export type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceInr: number;
  currency: 'INR';
  category: ProductCategory;
  imageUrl?: string;
  inStock: boolean;
};

export type CartItem = {
  productId: string;
  quantity: number;
  priceInr: number;
};

export type UserSession = {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
};

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  userId: string;
  items: CartItem[];
  totalInr: number;
  status: OrderStatus;
  createdAt: string;
};

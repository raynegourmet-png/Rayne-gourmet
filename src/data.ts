import { Product, LoyaltyTier, StoreConfig } from './types';

export const INITIAL_LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minOrders: 0,
    color: '#CD7F32',
    benefits: ['Acesso antecipado a novos sabores', 'Cartão fidelidade digital'],
  },
  {
    id: 'prata',
    name: 'Prata',
    minOrders: 5,
    color: '#C0C0C0',
    benefits: ['5% de desconto em pedidos acima de R$ 50', 'Brinde surpresa no mês do aniversário'],
  },
  {
    id: 'ouro',
    name: 'Ouro',
    minOrders: 15,
    color: '#FFD700',
    benefits: ['10% de desconto em todos os pedidos', 'Entrega grátis (até 5km)', 'Prioridade na fila de produção'],
  },
  {
    id: 'diamante',
    name: 'Diamante',
    minOrders: 30,
    color: '#B9F2FF',
    benefits: ['15% de desconto em todos os pedidos', 'Degustação gratuita de lançamentos', 'Canal de atendimento exclusivo'],
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // SABORES ESPECIAIS - R$ 5,00
  {
    id: "pudim",
    name: "Dindin Gourmet Pudim",
    categoria: "Sabores Especiais",
    price: 5.00,
    stock: 50,
    description: "Dindin Gourmet sabor Pudim",
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "amendoim",
    name: "Dindin Gourmet Amendoim",
    categoria: "Sabores Especiais",
    price: 5.00,
    stock: 50,
    description: "Dindin Gourmet sabor Amendoim",
    image: "https://images.unsplash.com/photo-1534119428213-911478146761?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "oreo",
    name: "Dindin Gourmet Oreo",
    categoria: "Sabores Especiais",
    price: 5.00,
    stock: 50,
    description: "Dindin Gourmet sabor Oreo",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop",
    available: true
  },

  // SABORES PREMIUM - R$ 6,00
  {
    id: "maracuja-chocolate",
    name: "Dindin Gourmet Maracujá c/ Chocolate",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Maracujá com cobertura de Chocolate",
    image: "https://images.unsplash.com/photo-1591115765373-520b7a2d7a59?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "oreo-chocolate",
    name: "Dindin Gourmet Oreo c/ Chocolate",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Oreo com cobertura de Chocolate",
    image: "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "morango-nutella",
    name: "Dindin Gourmet Morango c/ Nutella",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Morango com Nutella",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "ninho-nutella",
    name: "Dindin Gourmet Ninho c/ Nutella",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Leite Ninho com Nutella",
    image: "https://images.unsplash.com/photo-1559181567-c3190cb9959b?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "ninho-morango",
    name: "Dindin Gourmet Ninho c/ Morango",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Leite Ninho com geleia/pedaços de Morango",
    image: "https://images.unsplash.com/photo-1559181567-c3190cb9959b?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "morango-chocolate-branco",
    name: "Dindin Gourmet Morango c/ Chocolate Branco",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Morango com Chocolate Branco",
    image: "https://images.unsplash.com/photo-1549128247-37e905ebbdb6?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "amendoim-nutella",
    name: "Dindin Gourmet Amendoim c/ Nutella",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Amendoim com Nutella",
    image: "https://images.unsplash.com/photo-1534119428213-911478146761?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "prestigio",
    name: "Dindin Gourmet Prestígio",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor Prestígio (Coco com Chocolate)",
    image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400&h=400&fit=crop",
    available: true
  },
  {
    id: "ouro-branco",
    name: "Dindin Gourmet Ouro Branco",
    categoria: "Sabores Premium",
    price: 6.00,
    stock: 50,
    description: "Dindin Gourmet sabor bombom Ouro Branco",
    image: "https://images.unsplash.com/photo-1579306194872-64d3b7bac4c2?w=400&h=400&fit=crop",
    available: true
  }
];

export const INITIAL_CONFIG: Omit<StoreConfig, 'id'> = {
  name: "Rayne Gourmet",
  phone: "5597984493292",
  instagram: "rayne_gourmet",
  address: "Sua Cidade, AM",
  workingHours: "Segunda a Sábado: 08:00 - 18:00",
  pixKey: "seu-pix@email.com",
  deliveryFeeDefault: 5.0,
  isOpen: true
};

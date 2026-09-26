import { motion } from 'motion/react';
import { Plus, Minus, Info } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  const isAvailable = product.available && (product.stock ?? 0) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${!isAvailable ? 'grayscale opacity-50' : ''}`}
          referrerPolicy="no-referrer"
        />
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-white text-[#3E2723] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Esgotado
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-[#3E2723] text-lg leading-tight">{product.name}</h3>
          <span className="text-[#E63956] font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
        </div>
        <p className="text-sm text-[#3E2723]/70 mb-4 flex-grow line-clamp-2">
          {product.description}
        </p>

        <div className="mt-auto">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-[#F9F9F6] rounded-full p-1 border border-[#3E2723]/10">
              <button
                onClick={onRemove}
                aria-label={`Remover uma unidade de ${product.name}`}
                className="w-8 h-8 flex items-center justify-center text-[#3E2723] hover:bg-white rounded-full transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="font-bold text-[#3E2723]">{quantity}</span>
              <button
                onClick={onAdd}
                disabled={!isAvailable}
                aria-label={`Adicionar mais uma unidade de ${product.name}`}
                className="w-8 h-8 flex items-center justify-center text-[#3E2723] hover:bg-white rounded-full transition-colors disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              disabled={!isAvailable}
              className="w-full bg-[#F9F9F6] text-[#3E2723] border border-[#3E2723]/10 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#E63956] hover:text-white hover:border-[#E63956] transition-all disabled:opacity-50 disabled:hover:bg-[#F9F9F6] disabled:hover:text-[#3E2723] disabled:hover:border-[#3E2723]/10"
            >
              <Plus size={18} />
              Adicionar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

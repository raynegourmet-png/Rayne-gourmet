import { motion } from 'motion/react';
import { ShoppingCart, Crown, Settings, Loader2, LogOut, User as UserIcon, Star } from 'lucide-react';
import { User } from 'firebase/auth';
import { LoyaltyTier } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  onLoginClick: () => void;
  onAdminClick: () => void;
  onLogoutClick: () => void;
  cartCount: number;
  isAdmin: boolean;
  isStoreOpen: boolean;
  isLoggingIn?: boolean;
  user: User | null;
  points: number;
  loyaltyTiers: LoyaltyTier[];
}

export default function Header({ 
  onMenuClick, 
  onLoginClick, 
  onAdminClick, 
  onLogoutClick,
  cartCount, 
  isAdmin, 
  isStoreOpen, 
  isLoggingIn,
  user,
  points,
  loyaltyTiers
}: HeaderProps) {
  const currentTier = [...loyaltyTiers].reverse().find(t => points >= t.minOrders) || loyaltyTiers[0];
  const nextTier = loyaltyTiers.find(t => t.minOrders > points);
  const progress = nextTier 
    ? ((points - (currentTier?.minOrders || 0)) / (nextTier.minOrders - (currentTier?.minOrders || 0))) * 100 
    : 100;

  return (
    <header className="relative w-full bg-[#FFFDE7] overflow-hidden">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img 
            src="/assets/images/rayne_gourmet_logo_1789856632119.jpg" 
            alt="Rayne Gourmet Logo" 
            loading="lazy"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-[#3E2723] font-bold text-lg md:text-xl tracking-tight leading-none">Rayne Gourmet</span>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isStoreOpen ? 'text-green-600' : 'text-red-600'}`}>
                {isStoreOpen ? 'Aberta' : 'Fechada'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-4">
          {isAdmin && (
            <button 
              onClick={onAdminClick}
              aria-label="Abrir painel de controle"
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-white font-bold text-xs md:text-sm bg-[#E63956] rounded-full hover:bg-[#D81B60] transition-all shadow-md shadow-[#E63956]/20"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Painel de Controle</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 md:gap-3 bg-white px-2 py-1 md:px-3 md:py-2 rounded-2xl border border-[#3E2723]/5 shadow-sm">
                <button 
                  onClick={onLoginClick}
                  className="flex items-center gap-2 md:gap-3 text-left"
                >
                  <div className="relative">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || ''} 
                        className="w-10 h-10 rounded-xl border-2 border-[#E63956]/10" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#E63956]/10 flex items-center justify-center text-[#E63956]">
                        <UserIcon size={20} />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#3E2723]/5">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-black text-[#3E2723] leading-none uppercase truncate max-w-[100px]">
                      {user.displayName || 'Cliente'}
                    </span>
                    
                    <div className="mt-1.5 w-24 h-1.5 bg-[#F9F9F6] rounded-full overflow-hidden border border-[#3E2723]/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: currentTier?.color }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[8px] font-black uppercase opacity-40 tracking-tighter" style={{ color: currentTier?.color }}>{currentTier?.name}</span>
                      <span className="text-[8px] font-black text-[#E63956]">{points} un</span>
                    </div>
                  </div>
                </button>

                <div className="w-px h-8 bg-[#3E2723]/5 mx-1" />

                <button 
                  onClick={onLogoutClick} 
                  className="text-[#3E2723]/20 hover:text-[#E63956] transition-colors p-2"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                disabled={isLoggingIn}
                aria-label="Entrar / Club Rayne"
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-[#3E2723] font-bold text-xs md:text-sm bg-white border border-[#3E2723]/5 rounded-full hover:bg-[#F9F9F6] transition-all shadow-sm disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 size={16} className="text-[#E63956] animate-spin" />
                ) : (
                  <Crown size={16} className="text-[#E63956]" />
                )}
                <span>Club Rayne</span>
              </button>
            )}
          </div>

          <button 
            onClick={onMenuClick}
            aria-label={`Ver carrinho (${cartCount} itens)`}
            className="relative p-2 text-[#E63956] hover:bg-[#E63956]/10 rounded-full transition-colors"
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E63956] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#FFFDE7]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="px-6 py-12 md:py-20 flex flex-col items-center text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#3E2723] leading-tight mb-4">
            Dindins Gourmet <span className="text-[#E63956]">Feitos com Amor</span>
          </h1>
          <p className="text-lg md:text-xl text-[#3E2723]/80 mb-8 font-medium">
            Ingredientes selecionados para transformar o seu momento em uma experiência inesquecível.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="bg-[#E63956] text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-[#E63956]/20 hover:bg-[#D81B60] transition-all"
          >
            Ver Cardápio & Fazer Pedido
          </motion.button>
        </motion.div>
      </div>

      <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-[#4FC3F7]/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-80 h-80 bg-[#E63956]/5 rounded-full blur-3xl -ml-40 -mb-40"></div>
    </header>
  );
}

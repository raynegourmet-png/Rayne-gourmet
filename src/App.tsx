import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import ClubRayne from './components/ClubRayne';
import FeedbackModal from './components/FeedbackModal';
import WhatsAppButton from './components/WhatsAppButton';
import { INITIAL_PRODUCTS, INITIAL_LOYALTY_TIERS } from './data';
import { Product, CartItem, LoyaltyTier, Coupon, DeliveryArea, StoreConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, LogIn, Crown, History, Settings, LogOut, Sparkles, Star, Loader2, Clock } from 'lucide-react';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { initializeDataIfEmpty, handleDatabaseError, OperationType } from './lib/db';

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('rayne_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>(INITIAL_LOYALTY_TIERS);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [isLoading, setIsLoading] = useState(() => {
    // Se temos produtos em cache, não precisamos da tela de carregamento bloqueante
    return !localStorage.getItem('rayne_products');
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<'Tudo' | 'Sabores' | 'Outros'>('Tudo');
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(() => {
    const saved = localStorage.getItem('rayne_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Inicialização silenciosa em background
    initializeDataIfEmpty(INITIAL_PRODUCTS, INITIAL_LOYALTY_TIERS);
  }, []);

  useEffect(() => {
    const adminEmails = ['raynegourmet@gmail.com', 'dfilho02@gmail.com'];
    const isAdminUser = user?.email ? adminEmails.includes(user.email) : false;
    
    if (isAdminUser) {
      // Re-run for admins just in case
      initializeDataIfEmpty(INITIAL_PRODUCTS, INITIAL_LOYALTY_TIERS);
    }
  }, [user]);

  useEffect(() => {
    // Captura o resultado do redirect assim que o app carrega
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Login realizado com sucesso via redirect:", result.user.email);
        }
      } catch (err: any) {
        console.error("Erro ao processar retorno do Google:", err);
        const errorMessage = err.code === 'auth/unauthorized-domain' 
          ? `Domínio não autorizado: ${window.location.hostname}. Adicione este domínio no console do Firebase.`
          : err.code === 'auth/operation-not-supported-in-this-environment' || window.self !== window.top
          ? "O login com o Google só pode ser realizado diretamente no site publicado (rayne-gourmet-7801e.web.app)"
          : "Erro ao concluir login. Tente novamente no domínio oficial.";
        
        console.warn(errorMessage);
        if (err.code !== 'auth/operation-not-supported-in-this-environment') {
          alert(errorMessage);
        }
      } finally {
        setIsLoggingIn(false);
      }
    };
    
    handleRedirect();

    let unsubscribeUserOrders: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeUserOrders) {
        unsubscribeUserOrders();
        unsubscribeUserOrders = null;
      }

      if (currentUser) {
        const ordersRef = ref(db, 'orders');
        const qUserOrders = query(
          ordersRef, 
          orderByChild('userId'),
          equalTo(currentUser.uid)
        );
        unsubscribeUserOrders = onValue(qUserOrders, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const ordersArray = Object.keys(data).map(key => ({ id: key, ...data[key] }))
              .sort((a, b) => b.timestamp - a.timestamp);
            setUserOrders(ordersArray);
          } else {
            setUserOrders([]);
          }
        });
      } else {
        setUserOrders([]);
      }
    });

    // Listen to products
    const productsRef = ref(db, 'products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as Product))
          .sort((a, b) => a.name.localeCompare(b.name));
        setProducts(productsArray);
        localStorage.setItem('rayne_products', JSON.stringify(productsArray));
      }
      setIsLoading(false);
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'products');
      setIsLoading(false);
    });

    // Listen to tiers
    const tiersRef = ref(db, 'loyaltyTiers');
    const unsubscribeTiers = onValue(tiersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tiersArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as LoyaltyTier))
          .sort((a, b) => a.minOrders - b.minOrders);
        setLoyaltyTiers(tiersArray);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'loyaltyTiers');
    });

    // Listen to coupons
    const couponsRef = ref(db, 'coupons');
    const unsubscribeCoupons = onValue(couponsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const couponsArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as Coupon));
        setCoupons(couponsArray);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'coupons');
    });

    // Listen to delivery areas
    const areasRef = ref(db, 'deliveryAreas');
    const unsubscribeAreas = onValue(areasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const areasArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryArea))
          .sort((a, b) => a.name.localeCompare(b.name));
        setDeliveryAreas(areasArray);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'deliveryAreas');
    });

    // Listen to store config
    const configRef = ref(db, 'config/settings');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const configData = { id: 'settings', ...snapshot.val() } as StoreConfig;
        setStoreConfig(configData);
        localStorage.setItem('rayne_config', JSON.stringify(configData));
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.GET, 'config/settings');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeTiers();
      unsubscribeCoupons();
      unsubscribeAreas();
      unsubscribeConfig();
      unsubscribeAuth();
      if (unsubscribeUserOrders) unsubscribeUserOrders();
    };
  }, []);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty >= (product.stock ?? 0)) return prev;

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          let newQty = item.quantity + delta;
          if (product && newQty > (product.stock ?? 0)) newQty = (product.stock ?? 0);
          newQty = Math.max(0, newQty);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleLogin = async () => {
    if (user) {
      setIsLoyaltyOpen(true);
      return;
    }
    
    // Verificação de Iframe para exibir aviso amigável
    if (window.self !== window.top) {
      alert("O login com o Google só pode ser realizado diretamente no site publicado (rayne-gourmet-7801e.web.app)");
      return;
    }
    
    setIsLoggingIn(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setIsLoggingIn(false);
      console.error("Erro ao iniciar login:", err);
      const errorMessage = err.code === 'auth/unauthorized-domain'
        ? `Domínio não autorizado: ${window.location.hostname}. Adicione este domínio no console do Firebase.`
        : (err.code === 'auth/operation-not-supported-in-this-environment' || window.self !== window.top)
        ? "O login com o Google só pode ser realizado diretamente no site publicado (rayne-gourmet-7801e.web.app)"
        : "Não foi possível iniciar o login. Tente novamente no domínio oficial.";
      
      alert(errorMessage);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const adminEmails = ['raynegourmet@gmail.com', 'dfilho02@gmail.com'];
  const isAdmin = user?.email ? adminEmails.includes(user.email) : false;

  const clearCart = () => setCart([]);

  const filteredProducts = products.filter(p => {
    if (activeCategory === 'Tudo') return true;
    const isFlavor = p.categoria?.startsWith('Sabores') || p.name.toLowerCase().includes('dindin') || p.name.toLowerCase().includes('dindim');
    
    if (activeCategory === 'Sabores') {
      return isFlavor;
    }
    if (activeCategory === 'Outros') {
      return !isFlavor;
    }
    return p.categoria === activeCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F6] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="text-[#E63956] w-12 h-12" />
        </motion.div>
        <p className="text-[#3E2723] font-bold animate-pulse text-lg">Preparando as delícias...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F6] text-[#3E2723] selection:bg-[#E63956]/20">
      <Header 
        onMenuClick={() => setIsCartOpen(true)} 
        onLoginClick={handleLogin}
        onAdminClick={() => setIsAdminOpen(true)}
        cartCount={cartCount} 
        isAdmin={isAdmin}
        isStoreOpen={storeConfig?.isOpen ?? true}
        isLoggingIn={isLoggingIn}
      />

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        {storeConfig?.isOpen === false && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-800"
          >
            <div className="bg-amber-100 p-2 rounded-xl">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-tight">Loja Fechada no Momento</h3>
              <p className="text-xs font-bold opacity-80">Estamos preparando novas delícias! Você ainda pode navegar pelo cardápio, mas o envio de pedidos está temporariamente desativado.</p>
            </div>
          </motion.div>
        )}

        {user && (
          <div className="flex justify-end mb-8">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-[#3E2723]/5 shadow-sm">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full" />
              )}
              <span className="text-xs font-bold text-[#3E2723]">{user.displayName}</span>
              {isAdmin && (
                <button 
                  onClick={() => setIsAdminOpen(true)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Painel de Gestão"
                >
                  <Settings size={16} />
                </button>
              )}
              <button onClick={handleLogout} className="text-[#3E2723]/40 hover:text-[#E63956] transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
        <section id="menu">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-[#E63956] font-bold uppercase tracking-widest text-sm mb-2">
                <Sparkles size={16} />
                <span>Nosso Cardápio</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#3E2723]">Escolha suas Delícias</h2>
            </div>

            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl shadow-sm border border-[#3E2723]/5 self-start overflow-x-auto no-scrollbar">
              {(['Tudo', 'Sabores', 'Outros'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as any)}
                  className={`px-4 md:px-6 py-2.5 rounded-xl font-bold transition-all text-sm md:text-base ${activeCategory === cat ? 'bg-[#E63956] text-white shadow-md shadow-[#E63956]/20' : 'text-[#3E2723]/60 hover:text-[#3E2723]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => {
                const cartItem = cart.find(item => item.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={cartItem?.quantity || 0}
                    onAdd={() => addToCart(product)}
                    onRemove={() => updateCartQuantity(product.id, -1)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        <ClubRayne 
          tiers={loyaltyTiers} 
          userOrdersCount={userOrders.length}
          isLoggedIn={!!user}
          onJoin={handleLogin}
          isLoggingIn={isLoggingIn}
        />

      </main>

      <footer className="bg-[#3E2723] text-white/60 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-white font-bold text-xl mb-2">Rayne Gourmet</h4>
            <p className="text-sm">O melhor dindin gourmet da região.</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#E63956] transition-colors">Instagram</a>
            <a href="https://wa.me/5597984493292" target="_blank" rel="noopener noreferrer" className="hover:text-[#E63956] transition-colors">WhatsApp</a>
            <a href="#" className="hover:text-[#E63956] transition-colors">Facebook</a>
            <button onClick={() => setIsAdminOpen(true)} className="hover:text-white transition-colors flex items-center gap-1">
              <Settings size={14} />
              Gestão
            </button>
          </div>
          <p className="text-xs">© 2024 Rayne Gourmet. Todos os direitos reservados.</p>
        </div>
      </footer>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateCartQuantity}
        onClear={clearCart}
        coupons={coupons}
        deliveryAreas={deliveryAreas}
        user={user}
        isStoreOpen={storeConfig?.isOpen ?? true}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        loyaltyTiers={loyaltyTiers}
        user={user}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={user}
      />

      <WhatsAppButton />

      {/* Feedback Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-24 left-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors group flex items-center gap-2 overflow-hidden"
      >
        <Star size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 font-bold text-sm">
          Avalie-nos
        </span>
      </motion.button>
    </div>
  );
}

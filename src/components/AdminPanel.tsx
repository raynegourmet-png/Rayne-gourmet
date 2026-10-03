import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Lock, X, Save, Power, Edit3, Trash2, History, Crown, Plus, LogOut, Mail, Loader2, Package, ImageIcon, Rocket, Check, Share2, Sparkles, BarChart3, PieChart, Ticket, Truck, MapPin, Clock, CreditCard, User as UserIcon, MessageSquare, Star, Users } from 'lucide-react';
import { Product, Order, LoyaltyTier, Coupon, DeliveryArea, StoreConfig, OrderStatus, Category, Feedback } from '../types';
import { addProduct, updateProduct, deleteProduct, updateLoyaltyTier, getOrders, getCoupons, addCoupon, updateCoupon, deleteCoupon, getDeliveryAreas, addDeliveryArea, updateDeliveryArea, deleteDeliveryArea, getStoreConfig, updateStoreConfig, updateOrder, deleteOrder, getFeedbacks, uploadImage, deleteImage, handleFirestoreError, handleDatabaseError, OperationType, updateUserPoints } from '../lib/db';
import { INITIAL_CONFIG } from '../data';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import FlyerGenerator from './FlyerGenerator';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  loyaltyTiers: LoyaltyTier[];
  user: User | null;
  storeConfig: StoreConfig;
  setStoreConfig: (config: StoreConfig) => void;
}

type Tab = 'resumo' | 'produtos' | 'fidelidade' | 'cupons' | 'entrega' | 'flyer' | 'config' | 'pedidos' | 'feedbacks' | 'clientes';

export default function AdminPanel({ isOpen, onClose, products, loyaltyTiers, user, storeConfig, setStoreConfig }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [error, setError] = useState('');
  
  // Flyer state
  const [selectedForFlyer, setSelectedForFlyer] = useState<string[]>([]);
  const [selectedFeedbacksForFlyer, setSelectedFeedbacksForFlyer] = useState<string[]>([]);
  const [flyerType, setFlyerType] = useState<'menu' | 'feedbacks'>('menu');
  const [isShowingFlyer, setIsShowingFlyer] = useState(false);

  // New product state
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 5.0,
    categoria: 'Sabores 1',
    image: '/assets/images/gourmet_dindin_premium_flavors_1789856658729.jpg',
    images: [],
    imagePaths: [],
    available: true,
    stock: 50
  });

  // New Coupon state
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Omit<Coupon, 'id'>>({
    code: '',
    discount: 10,
    type: 'percentage',
    minOrderValue: 0,
    validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
    active: true
  });

  // New Delivery Area state
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newArea, setNewArea] = useState<Omit<DeliveryArea, 'id'>>({
    name: '',
    fee: 5.0
  });

  const adminEmails = ['raynegourmet@gmail.com', 'dfilho02@gmail.com'];
  const isAdmin = user?.email ? adminEmails.includes(user.email) : false;

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'product' | 'coupon' | 'area' | 'order';
    title: string;
  } | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      setSelectedForFlyer(products.filter(p => p.available).map(p => p.id));
    }
  }, [products]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeCoupons: (() => void) | null = null;
    let unsubscribeAreas: (() => void) | null = null;
    let unsubscribeFeedbacks: (() => void) | null = null;

    if (isAdmin) {
      // No internal config listener needed anymore as it's handled in App.tsx

      // Listen to all orders in real-time
      const ordersRef = ref(db, 'orders');
      unsubscribeOrders = onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const ordersArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as Order))
            .sort((a, b) => b.timestamp - a.timestamp);
          setOrders(ordersArray);
        } else {
          setOrders([]);
        }
      }, (err) => {
        handleDatabaseError(err, OperationType.LIST, 'orders');
      });

      // Listen to coupons in real-time
      const couponsRef = ref(db, 'coupons');
      unsubscribeCoupons = onValue(couponsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const couponsArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as Coupon));
          setCoupons(couponsArray);
        } else {
          setCoupons([]);
        }
      }, (err) => {
        handleDatabaseError(err, OperationType.LIST, 'coupons');
      });

      // Listen to delivery areas in real-time
      const areasRef = ref(db, 'deliveryAreas');
      unsubscribeAreas = onValue(areasRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const areasArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryArea))
            .sort((a, b) => a.name.localeCompare(b.name));
          setDeliveryAreas(areasArray);
        } else {
          setDeliveryAreas([]);
        }
      }, (err) => {
        handleDatabaseError(err, OperationType.LIST, 'deliveryAreas');
      });

      // Listen to feedbacks in real-time
      const feedbacksRef = ref(db, 'feedbacks');
      unsubscribeFeedbacks = onValue(feedbacksRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const feedbacksArray = Object.keys(data).map(key => ({ id: key, ...data[key] } as Feedback))
            .sort((a, b) => b.timestamp - a.timestamp);
          setFeedbacks(feedbacksArray);
        } else {
          setFeedbacks([]);
        }
      }, (err) => {
        handleDatabaseError(err, OperationType.LIST, 'feedbacks');
      });
    }

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCoupons) unsubscribeCoupons();
      if (unsubscribeAreas) unsubscribeAreas();
      if (unsubscribeFeedbacks) unsubscribeFeedbacks();
    };
  }, [isAdmin]);



  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google login error:", err);
      let errorMessage = `Erro ao iniciar login: ${err.message}`;
      
      if (err.code === 'auth/unauthorized-domain') {
        errorMessage = `Domínio não autorizado: ${window.location.hostname}. Adicione este domínio no console do Firebase.`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File, callback: (url: string, path: string) => void) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const storagePath = `products/${timestamp}_${file.name}`;
      const { url, path } = await uploadImage(file, storagePath);
      callback(url, path);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("Falha ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      // Use first image from gallery as main thumbnail if available
      const productToSave = {
        ...newProduct,
        image: newProduct.images && newProduct.images.length > 0 ? newProduct.images[0] : newProduct.image,
        imagePath: newProduct.imagePaths && newProduct.imagePaths.length > 0 ? newProduct.imagePaths[0] : (newProduct.imagePath || '')
      };
      
      await addProduct(productToSave);
      setIsAdding(false);
      setNewProduct({
        name: '',
        description: '',
        price: 5.0,
        categoria: 'Sabores 1',
        image: '/assets/images/gourmet_dindin_premium_flavors_1789856658729.jpg',
        images: [],
        imagePaths: [],
        available: true,
        stock: 50
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) return;
    setDeleteConfirm({ id, type: 'product', title: 'este produto' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isAdmin) return;
    
    setIsLoading(true);
    try {
      const { id, type } = deleteConfirm;
      if (type === 'product') await deleteProduct(id);
      else if (type === 'coupon') await deleteCoupon(id);
      else if (type === 'area') await deleteDeliveryArea(id);
      else if (type === 'order') await deleteOrder(id);
      
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error(`Error deleting ${deleteConfirm.type}:`, err);
      alert(`Erro ao excluir: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    if (!isAdmin) return;
    try {
      await updateProduct(product.id, { available: !product.available });
    } catch (err) {
      console.error("Erro ao alternar disponibilidade:", err);
      alert("Erro ao salvar alteração. Tente novamente.");
    }
  };

  const onUpdatePrice = async (id: string, newPrice: string) => {
    if (!isAdmin) return;
    try {
      const priceNum = parseFloat(newPrice) || 0;
      await updateProduct(id, { price: priceNum });
    } catch (err) {
      console.error("Erro ao atualizar preço:", err);
      alert("Erro ao salvar preço.");
    }
  };

  const onUpdateStock = async (id: string, newStock: string) => {
    if (!isAdmin) return;
    try {
      const stockNum = parseInt(newStock) || 0;
      await updateProduct(id, { stock: stockNum });
    } catch (err) {
      console.error("Erro ao atualizar estoque:", err);
      alert("Erro ao salvar estoque.");
    }
  };

  const onUpdateField = async (id: string, field: string, value: string) => {
    if (!isAdmin) return;
    try {
      await updateProduct(id, { [field]: value });
    } catch (err) {
      console.error(`Erro ao atualizar ${field}:`, err);
      alert(`Erro ao salvar ${field}.`);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      await addCoupon(newCoupon);
      setIsAddingCoupon(false);
      setNewCoupon({
        code: '',
        discount: 10,
        type: 'percentage',
        minOrderValue: 0,
        validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
        active: true
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCoupon = async (id: string, data: Partial<Coupon>) => {
    if (!isAdmin) return;
    await updateCoupon(id, data);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!isAdmin) {
      alert('Você não tem permissão para excluir cupons.');
      return;
    }
    setDeleteConfirm({ id, type: 'coupon', title: 'este cupom' });
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      await addDeliveryArea(newArea);
      setIsAddingArea(false);
      setNewArea({ name: '', fee: 5.0 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateArea = async (id: string, data: Partial<DeliveryArea>) => {
    if (!isAdmin) return;
    await updateDeliveryArea(id, data);
  };

  const handleDeleteArea = async (id: string) => {
    if (!isAdmin) return;
    setDeleteConfirm({ id, type: 'area', title: 'esta área de entrega' });
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !storeConfig) return;
    setIsLoading(true);
    try {
      const { id, ...configData } = storeConfig;
      await updateStoreConfig(configData);
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    if (!isAdmin) {
      alert('Você não tem permissão para alterar o status do pedido.');
      return;
    }
    
    try {
      await updateOrder(id, { status });
      
      // Credit points if order is finished and has a userId
      if (status === 'finished') {
        const order = orders.find(o => o.id === id);
        if (order && order.userId) {
          // 1 point per R$ 1.00 spent
          const pointsToCredit = Math.floor(order.total);
          await updateUserPoints(order.userId, pointsToCredit);
        }
      }
    } catch (err: any) {
      console.error("Error updating order status:", err);
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!isAdmin) {
      alert('Você não tem permissão para excluir pedidos.');
      return;
    }
    setDeleteConfirm({ id, type: 'order', title: 'este pedido' });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-[#F9F9F6] w-full h-full sm:h-[95vh] sm:max-w-6xl sm:rounded-[40px] overflow-hidden flex flex-col sm:flex-row shadow-2xl"
            >
              {/* Sidebar Navigation */}
              <aside className="hidden sm:flex flex-col w-64 bg-[#3E2723] text-white shrink-0">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <Settings size={24} className="text-[#E63956]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tighter leading-none">Painel ADM</h2>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Rayne Gourmet</p>
                    </div>
                  </div>

                  <nav className="space-y-1">
                    {[
                      { id: 'resumo', icon: BarChart3, label: 'Resumo' },
                      { id: 'pedidos', icon: History, label: 'Pedidos' },
                      { id: 'produtos', icon: Package, label: 'Produtos' },
                      { id: 'clientes', icon: Users, label: 'Clientes' },
                      { id: 'feedbacks', icon: MessageSquare, label: 'Feedbacks' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#E63956] text-white shadow-lg shadow-[#E63956]/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        <tab.icon size={18} />
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  <div className="my-6 border-t border-white/5 pt-6">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 px-4">Configurações</p>
                    <nav className="space-y-1">
                      {[
                        { id: 'fidelidade', icon: Crown, label: 'Fidelidade' },
                        { id: 'cupons', icon: Ticket, label: 'Cupons' },
                        { id: 'entrega', icon: Truck, label: 'Entrega' },
                        { id: 'config', icon: Settings, label: 'Loja' },
                        { id: 'flyer', icon: Rocket, label: 'Flyer' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as Tab)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#E63956] text-white shadow-lg shadow-[#E63956]/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                          <tab.icon size={18} />
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                <div className="mt-auto p-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><UserIcon size={14} /></div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-black truncate">{user?.displayName?.split(' ')[0]}</p>
                      <button onClick={handleLogout} className="text-[9px] font-black text-[#E63956] uppercase hover:underline">Sair</button>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-grow flex flex-col min-w-0">
                {/* Mobile Top Header */}
                <div className="sm:hidden bg-[#3E2723] text-white p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Settings size={20} className="text-[#E63956]" />
                    <h2 className="text-sm font-black uppercase tracking-tighter">Painel de Gestão</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        const currentStatus = storeConfig.isOpen !== false;
                        const newStatus = !currentStatus;
                        setStoreConfig({...storeConfig, isOpen: newStatus});
                        try {
                          await updateStoreConfig({ isOpen: newStatus });
                        } catch (err) {
                          alert("Erro ao atualizar status da loja.");
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all active:scale-95 ${storeConfig.isOpen !== false ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${storeConfig.isOpen !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[9px] font-black uppercase tracking-tighter">
                        {storeConfig.isOpen !== false ? 'Aberta' : 'Fechada'}
                      </span>
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={24} /></button>
                  </div>
                </div>

                {/* Mobile Tab Nav */}
                <div className="sm:hidden bg-white border-b border-[#3E2723]/5 px-4 py-2 overflow-x-auto no-scrollbar flex gap-2">
                  {[
                    { id: 'resumo', label: 'Resumo' },
                    { id: 'pedidos', label: 'Pedidos' },
                    { id: 'produtos', label: 'Produtos' },
                    { id: 'config', label: 'Loja' },
                    { id: 'clientes', label: 'Clientes' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#E63956] text-white' : 'text-[#3E2723]/40'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content Header (Desktop) */}
                <header className="hidden sm:flex items-center justify-between px-8 py-6 bg-white border-b border-[#3E2723]/5">
                  <div>
                    <h3 className="text-2xl font-black text-[#3E2723] uppercase tracking-tight">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </h3>
                    <p className="text-xs font-bold text-[#3E2723]/40 uppercase tracking-widest mt-1">Gerencie seu negócio em tempo real</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={async () => {
                        const currentStatus = storeConfig.isOpen !== false;
                        const newStatus = !currentStatus;
                        setStoreConfig({...storeConfig, isOpen: newStatus});
                        try {
                          await updateStoreConfig({ isOpen: newStatus });
                        } catch (err) {
                          alert("Erro ao atualizar status da loja.");
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all active:scale-95 ${storeConfig.isOpen !== false ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${storeConfig.isOpen !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Loja {storeConfig.isOpen !== false ? 'Aberta' : 'Fechada'}
                      </span>
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-[#F9F9F6] rounded-2xl text-[#3E2723]/20 hover:text-[#3E2723] transition-all"><X size={24} /></button>
                  </div>
                </header>

                <main className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                {!isAdmin ? (
                  <div className="max-w-md mx-auto py-12">
                    <div className="text-center mb-10">
                      <div className="w-24 h-24 bg-[#E63956]/5 rounded-[40px] flex items-center justify-center mx-auto mb-6">
                        <Lock size={48} className="text-[#E63956]" />
                      </div>
                      <h3 className="text-3xl font-black text-[#3E2723] uppercase tracking-tight mb-3">Painel Administrativo</h3>
                      <p className="text-sm text-[#3E2723]/60 font-medium px-8">Acesse com sua conta autorizada para gerenciar cardápio e pedidos.</p>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[#E63956] text-xs mb-8 font-black uppercase tracking-wider text-center p-4 bg-[#E63956]/5 rounded-2xl border border-[#E63956]/10"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="space-y-6">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white border-2 border-[#3E2723]/5 text-[#3E2723] py-5 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-[#F9F9F6] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-xl shadow-black/5"
                      >
                        {isLoading ? (
                          <Loader2 size={24} className="animate-spin text-[#E63956]" />
                        ) : (
                          <>
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Entrar com Google
                          </>
                        )}
                      </button>
                      
                      <p className="text-[10px] text-center font-black text-[#3E2723]/30 uppercase tracking-[0.2em]">
                        Somente administradores autorizados
                      </p>
                    </div>
                  </div>
                ) : (


                    <div className="mt-6">
                      {activeTab === 'clientes' && (
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-[#3E2723]">
                            <Users size={18} className="text-orange-600" />
                            <h3 className="font-black uppercase text-sm tracking-widest">Ranking de Clientes</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const customerStats = orders.filter(o => o.status === 'finished').reduce((acc, order) => {
                                const id = order.userId || order.customerName;
                                if (!acc[id]) {
                                  acc[id] = {
                                    name: order.customerName,
                                    count: 0,
                                    total: 0,
                                    isGoogleUser: !!order.userId
                                  };
                                }
                                acc[id].count += 1;
                                acc[id].total += order.total;
                                return acc;
                              }, {} as Record<string, { name: string; count: number; total: number; isGoogleUser: boolean }>);

                              const sortedCustomers = Object.values(customerStats).sort((a, b) => b.total - a.total);

                              if (sortedCustomers.length === 0) {
                                return (
                                  <div className="p-12 text-center bg-[#F9F9F6] rounded-[32px] border border-[#3E2723]/5">
                                    <Users size={48} className="mx-auto mb-4 text-[#3E2723]/10" />
                                    <p className="text-sm font-bold text-[#3E2723]/40">Nenhum cliente registrado ainda.</p>
                                  </div>
                                );
                              }

                              return sortedCustomers.map((customer, i) => (
                                <div key={i} className="bg-white border border-[#3E2723]/5 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#3E2723]/5 rounded-2xl flex items-center justify-center font-black text-[#3E2723]/20">
                                      {i + 1}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-black text-[#3E2723] text-sm">{customer.name}</p>
                                        {customer.isGoogleUser && (
                                          <span className="bg-blue-100 text-blue-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">Google</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-[#3E2723]/40 font-bold uppercase">{customer.count} pedidos realizados</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-[#3E2723]/40 uppercase mb-0.5">Total Gasto</p>
                                    <p className="text-sm font-black text-[#E63956]">R$ {customer.total.toFixed(2)}</p>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </section>
                      )}

                      {activeTab === 'feedbacks' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#3E2723]">
                              <MessageSquare size={18} className="text-indigo-600" />
                              <h3 className="font-black uppercase text-sm tracking-widest">Feedbacks dos Clientes</h3>
                            </div>
                            <div className="flex items-center gap-3">
                              {selectedFeedbacksForFlyer.length > 0 && (
                                <button
                                  onClick={() => {
                                    setFlyerType('feedbacks');
                                    setIsShowingFlyer(true);
                                  }}
                                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-600/5 px-4 py-2 rounded-xl border border-indigo-600/20"
                                >
                                  <Sparkles size={16} />
                                  Gerar Flyer ({selectedFeedbacksForFlyer.length})
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedFeedbacksForFlyer([])}
                                className="text-[9px] font-black uppercase text-[#3E2723]/40 hover:text-[#3E2723]"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedbacks.length === 0 ? (
                              <div className="p-12 text-center bg-[#F9F9F6] rounded-[32px] border border-[#3E2723]/5">
                                <MessageSquare size={48} className="mx-auto mb-4 text-[#3E2723]/10" />
                                <p className="text-sm font-bold text-[#3E2723]/40">Nenhum feedback recebido ainda.</p>
                              </div>
                            ) : (
                              feedbacks.map(feedback => (
                                <div 
                                  key={feedback.id} 
                                  onClick={() => {
                                    setSelectedFeedbacksForFlyer(prev => 
                                      prev.includes(feedback.id) ? prev.filter(id => id !== feedback.id) : [...prev, feedback.id]
                                    );
                                  }}
                                  className={`cursor-pointer transition-all border p-5 rounded-3xl shadow-sm space-y-3 ${selectedFeedbacksForFlyer.includes(feedback.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-[#3E2723]/5'}`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedFeedbacksForFlyer.includes(feedback.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                        {selectedFeedbacksForFlyer.includes(feedback.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                                      </div>
                                      <div>
                                        <p className="font-black text-[#3E2723] text-sm">{feedback.userName}</p>
                                        <p className="text-[10px] text-[#3E2723]/40 font-bold uppercase">{new Date(feedback.timestamp).toLocaleString()}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={12} className={i < feedback.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[#3E2723]/70 font-medium italic">"{feedback.comment}"</p>
                                </div>
                              ))
                            )}
                          </div>
                        </section>
                      )}

                      {activeTab === 'resumo' && (
                        <section className="space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-[#3E2723]/5 p-4 rounded-3xl shadow-sm">
                              <p className="text-[10px] font-black uppercase text-[#3E2723]/40 mb-1">Pedidos (Hoje)</p>
                              <p className="text-2xl font-black text-[#3E2723]">{orders.filter(o => o.status === 'finished' && new Date(o.timestamp).toDateString() === new Date().toDateString()).length}</p>
                            </div>
                            <div className="bg-white border border-[#3E2723]/5 p-4 rounded-3xl shadow-sm">
                              <p className="text-[10px] font-black uppercase text-[#3E2723]/40 mb-1">Faturamento (Hoje)</p>
                              <p className="text-2xl font-black text-green-500">R$ {orders.filter(o => o.status === 'finished' && new Date(o.timestamp).toDateString() === new Date().toDateString()).reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-white border border-[#3E2723]/5 p-4 rounded-3xl shadow-sm col-span-2 md:col-span-1">
                              <p className="text-[10px] font-black uppercase text-[#3E2723]/40 mb-1">Total Pedidos</p>
                              <p className="text-2xl font-black text-[#3E2723]">{orders.filter(o => o.status === 'finished').length}</p>
                            </div>
                          </div>

                          <div className="bg-[#F9F9F6] p-6 rounded-[32px] border border-[#3E2723]/5">
                            <h4 className="font-black text-[#3E2723] text-sm uppercase mb-4 flex items-center gap-2">
                              <BarChart3 size={18} className="text-[#E63956]" />
                              Top Sabores
                            </h4>
                            <div className="space-y-3">
                              {(() => {
                                const productStats = orders.filter(o => o.status === 'finished').reduce((acc, order) => {
                                  order.items.forEach(item => {
                                    acc[item.id] = (acc[item.id] || 0) + item.quantity;
                                  });
                                  return acc;
                                }, {} as Record<string, number>);

                                const sortedProducts = [...products]
                                  .map(p => ({ ...p, sales: productStats[p.id] || 0 }))
                                  .sort((a, b) => b.sales - a.sales)
                                  .slice(0, 5);

                                const maxSales = Math.max(...sortedProducts.map(p => p.sales), 1);

                                if (sortedProducts.every(p => p.sales === 0)) {
                                  return <p className="text-[10px] font-bold text-[#3E2723]/40 text-center py-4">Nenhuma venda registrada ainda.</p>;
                                }

                                return sortedProducts.map((p, i) => (
                                  <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-black text-[#3E2723]/20">0{i+1}</span>
                                      <p className="text-xs font-bold text-[#3E2723] truncate w-32">{p.name}</p>
                                    </div>
                                    <div className="flex-grow flex items-center gap-3">
                                      <div className="h-1.5 flex-grow bg-[#3E2723]/5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(p.sales / maxSales) * 100}%` }}
                                          className="h-full bg-[#E63956]" 
                                        />
                                      </div>
                                      <span className="text-[9px] font-black text-[#3E2723]/40 whitespace-nowrap">{p.sales} un</span>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </section>
                      )}

                      {activeTab === 'produtos' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#3E2723]">
                              <div className="p-2 bg-[#E63956]/10 rounded-xl">
                                <Package size={18} className="text-[#E63956]" />
                              </div>
                              <div>
                                <h3 className="font-black uppercase text-sm tracking-widest">Gestão de Produtos</h3>
                                <p className="text-[10px] text-[#3E2723]/40 font-bold uppercase tracking-tighter">Edite o cardápio que aparece no site</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setIsAdding(true);
                                setNewProduct(prev => ({ 
                                  ...prev, 
                                  name: '',
                                  description: '',
                                  images: [],
                                  imagePaths: [],
                                  categoria: 'Sabores' 
                                }));
                              }}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#E63956] bg-[#E63956]/5 px-4 py-2 rounded-xl hover:bg-[#E63956]/10 transition-colors"
                            >
                              <Plus size={16} />
                              Adicionar Produto
                            </button>
                          </div>

                          <AnimatePresence>
                            {isAdding && (
                              <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleAddProduct}
                                className="bg-[#F9F9F6] p-6 rounded-[32px] border border-[#3E2723]/5 space-y-4 overflow-hidden mb-6 shadow-sm"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Nome do Produto</label>
                                    <input
                                      type="text"
                                      required
                                      value={newProduct.name}
                                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                                      className="w-full bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                      placeholder="Ex: Dindin Gourmet Morango"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Preço (R$)</label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      required
                                      value={newProduct.price}
                                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                                      className="w-full bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Galeria de Fotos</label>
                                  <div className="flex flex-wrap gap-3">
                                    {newProduct.images?.map((img, idx) => (
                                      <div key={idx} className="relative group w-20 h-20 rounded-2xl bg-white border border-[#3E2723]/5 overflow-hidden shadow-sm">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newImages = [...(newProduct.images || [])];
                                            const newPaths = [...(newProduct.imagePaths || [])];
                                            newImages.splice(idx, 1);
                                            newPaths.splice(idx, 1);
                                            setNewProduct({...newProduct, images: newImages, imagePaths: newPaths});
                                          }}
                                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    ))}
                                    
                                    {isUploading ? (
                                      <div className="w-20 h-20 rounded-2xl bg-white border border-dashed border-[#E63956]/20 flex items-center justify-center">
                                        <Loader2 size={20} className="text-[#E63956] animate-spin" />
                                      </div>
                                    ) : (
                                      <>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            for (const file of files) {
                                              await handleImageUpload(file, (url, path) => {
                                                setNewProduct(prev => ({
                                                  ...prev,
                                                  images: [...(prev.images || []), url],
                                                  imagePaths: [...(prev.imagePaths || []), path]
                                                }));
                                              });
                                            }
                                          }}
                                          className="hidden"
                                          id="new-product-images-universal"
                                        />
                                        <label 
                                          htmlFor="new-product-images-universal"
                                          className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-[#E63956]/10 flex flex-col items-center justify-center gap-1 text-[#E63956]/40 cursor-pointer hover:bg-[#E63956]/5 transition-colors"
                                        >
                                          <Plus size={20} />
                                          <span className="text-[8px] font-black uppercase">Foto</span>
                                        </label>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Categoria</label>
                                      <select
                                        value={newProduct.categoria}
                                        onChange={e => setNewProduct({...newProduct, categoria: e.target.value as Category})}
                                        className="w-full bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                      >
                                        <option value="Sabores">Sabores (Geral)</option>
                                        <option value="Sabores Especiais">Sabores Especiais</option>
                                        <option value="Sabores Premium">Sabores Premium</option>
                                        <option value="Outros">Outros</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Estoque Inicial</label>
                                    <input
                                      type="number"
                                      value={newProduct.stock}
                                      onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                                      className="w-full bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white text-[#3E2723] py-3 rounded-2xl font-black text-xs uppercase border border-[#3E2723]/5">Cancelar</button>
                                  <button type="submit" disabled={isLoading} className="flex-1 bg-[#3E2723] text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Cadastro'}
                                  </button>
                                </div>
                              </motion.form>
                            )}
                          </AnimatePresence>

                          <div className="space-y-8">
                            {(() => {
                              // Group products by category just like home screen
                              const categories = ['Sabores', 'Sabores Especiais', 'Sabores Premium', 'Outros'];
                              
                              return categories.map(cat => {
                                const catProducts = products.filter(p => {
                                  if (cat === 'Sabores') return p.categoria === 'Sabores' || (!p.categoria && (p.name.toLowerCase().includes('dindin') || p.name.toLowerCase().includes('dindim')));
                                  return p.categoria === cat;
                                });

                                if (catProducts.length === 0) return null;

                                return (
                                  <div key={cat} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-px flex-grow bg-[#3E2723]/5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-[#3E2723]/30">{cat}</span>
                                      <div className="h-px flex-grow bg-[#3E2723]/5" />
                                    </div>
                                    <div className="grid gap-4">
                                      {catProducts.map(product => (
                                        <ProductListItem 
                                          key={product.id} 
                                          product={product}
                                          onUpdatePrice={onUpdatePrice}
                                          onUpdateStock={onUpdateStock}
                                          onUpdateField={onUpdateField}
                                          toggleAvailability={toggleAvailability}
                                          handleDeleteProduct={handleDeleteProduct}
                                          isAdmin={isAdmin}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </section>
                      )}



                      {activeTab === 'fidelidade' && (
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-[#3E2723]">
                            <Crown size={18} className="text-amber-500" />
                            <h3 className="font-black uppercase text-sm tracking-widest">Clube Rayne</h3>
                          </div>
                          <div className="space-y-4">
                            {loyaltyTiers.map((tier) => (
                              <div key={tier.id} className="p-5 bg-[#F9F9F6] rounded-[28px] border border-[#3E2723]/5 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }} />
                                    <h4 className="font-black text-xs uppercase tracking-widest" style={{ color: tier.color }}>{tier.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#3E2723]/5 shadow-sm">
                                  <span className="text-[8px] font-black text-[#3E2723]/40 uppercase tracking-tighter">Pontos Min.</span>
                                  <input
                                    type="number"
                                    value={tier.minPoints}
                                    onChange={(e) => updateLoyaltyTier(tier.id, { minPoints: parseInt(e.target.value) || 0 })}
                                    className="w-8 text-[10px] font-black bg-transparent outline-none text-center"
                                  />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {tier.benefits.map((benefit, bIdx) => (
                                    <div key={bIdx} className="flex gap-2 group">
                                      <input
                                        type="text"
                                        value={benefit}
                                        onChange={(e) => {
                                          const newBenefits = [...tier.benefits];
                                          newBenefits[bIdx] = e.target.value;
                                          updateLoyaltyTier(tier.id, { benefits: newBenefits });
                                        }}
                                        className="flex-grow text-[10px] font-medium bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 outline-none focus:border-[#E63956]/30 transition-colors"
                                      />
                                      <button
                                        onClick={() => {
                                          const newBenefits = [...tier.benefits];
                                          newBenefits.splice(bIdx, 1);
                                          updateLoyaltyTier(tier.id, { benefits: newBenefits });
                                        }}
                                        className="p-2 text-[#3E2723]/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => updateLoyaltyTier(tier.id, { benefits: [...tier.benefits, 'Novo benefício'] })}
                                    className="w-full py-2 rounded-xl border border-dashed border-[#3E2723]/10 text-[9px] font-black text-[#3E2723]/40 uppercase tracking-widest hover:border-[#E63956]/40 hover:text-[#E63956] transition-all"
                                  >
                                    + Adicionar Benefício
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {activeTab === 'cupons' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#3E2723]">
                              <Ticket size={18} className="text-purple-500" />
                              <h3 className="font-black uppercase text-sm tracking-widest">Cupons de Desconto</h3>
                            </div>
                            <button
                              onClick={() => setIsAddingCoupon(true)}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-purple-500 bg-purple-500/5 px-4 py-2 rounded-xl"
                            >
                              <Plus size={16} />
                              Novo Cupom
                            </button>
                          </div>

                          <AnimatePresence>
                            {isAddingCoupon && (
                              <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleAddCoupon}
                                className="bg-purple-50 p-6 rounded-[32px] border border-purple-200 space-y-4 overflow-hidden shadow-xl"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-purple-900/40">Código</label>
                                    <input
                                      type="text"
                                      required
                                      value={newCoupon.code}
                                      onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                      placeholder="EX: RAYNE10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-purple-900/40">Desconto</label>
                                    <input
                                      type="number"
                                      required
                                      value={newCoupon.discount}
                                      onChange={e => setNewCoupon({...newCoupon, discount: parseFloat(e.target.value) || 0})}
                                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button type="button" onClick={() => setIsAddingCoupon(false)} className="flex-1 bg-white text-purple-600 py-3 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                                  <button type="submit" disabled={isLoading} className="flex-1 bg-purple-500 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-purple-500/20">Confirmar</button>
                                </div>
                              </motion.form>
                            )}
                          </AnimatePresence>

                          <div className="grid gap-3">
                            {coupons.map(coupon => (
                              <div key={coupon.id} className="flex items-center justify-between p-4 bg-[#F9F9F6] rounded-2xl border border-[#3E2723]/5">
                                <div>
                                  <p className="text-sm font-black text-[#3E2723]">{coupon.code}</p>
                                  <p className="text-[10px] font-bold text-purple-500 uppercase">{coupon.discount}{coupon.type === 'percentage' ? '%' : ' R$'} de desconto</p>
                                </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleUpdateCoupon(coupon.id, { active: !coupon.active })}
                                      className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${coupon.active ? 'bg-purple-500' : 'bg-slate-200'}`}
                                    >
                                      <motion.div layout className={`w-3 h-3 rounded-full bg-white ${coupon.active ? 'ml-auto' : ''}`} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCoupon(coupon.id)} 
                                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Excluir Cupom"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {activeTab === 'entrega' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#3E2723]">
                              <MapPin size={18} className="text-emerald-500" />
                              <h3 className="font-black uppercase text-sm tracking-widest">Taxas por Bairro</h3>
                            </div>
                            <button
                              onClick={() => setIsAddingArea(true)}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/5 px-4 py-2 rounded-xl"
                            >
                              <Plus size={16} />
                              Nova Área
                            </button>
                          </div>

                          <AnimatePresence>
                            {isAddingArea && (
                              <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleAddArea}
                                className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-200 space-y-4 overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nome do Bairro"
                                    value={newArea.name}
                                    onChange={e => setNewArea({...newArea, name: e.target.value})}
                                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                  />
                                  <input
                                    type="number"
                                    required
                                    placeholder="Taxa (R$)"
                                    value={newArea.fee}
                                    onChange={e => setNewArea({...newArea, fee: parseFloat(e.target.value)})}
                                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none font-bold"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setIsAddingArea(false)} className="flex-1 bg-white text-emerald-600 py-3 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                                  <button type="submit" className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase">Salvar</button>
                                </div>
                              </motion.form>
                            )}
                          </AnimatePresence>

                          <div className="grid gap-3">
                            {deliveryAreas.map(area => (
                              <div key={area.id} className="flex items-center justify-between p-4 bg-[#F9F9F6] rounded-2xl border border-[#3E2723]/5">
                                <p className="text-sm font-black text-[#3E2723]">{area.name}</p>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-[#3E2723]/5 shadow-sm">
                                    <span className="text-[10px] font-black text-[#3E2723]/40">R$</span>
                                    <input
                                      type="number"
                                      value={area.fee}
                                      onChange={(e) => handleUpdateArea(area.id, { fee: parseFloat(e.target.value) || 0 })}
                                      className="w-10 text-xs font-black text-[#3E2723] outline-none bg-transparent"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteArea(area.id)} 
                                    className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir Área"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {activeTab === 'flyer' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#E63956]">
                              <Rocket size={18} />
                              <h3 className="font-black uppercase text-sm tracking-widest text-[#3E2723]">Gerador de Flyer</h3>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button
                                onClick={() => setFlyerType('menu')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${flyerType === 'menu' ? 'bg-white text-[#E63956] shadow-sm' : 'text-slate-400'}`}
                              >
                                Cardápio
                              </button>
                              <button
                                onClick={() => setFlyerType('feedbacks')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${flyerType === 'feedbacks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                              >
                                Avaliações
                              </button>
                            </div>
                          </div>

                          {flyerType === 'menu' ? (
                            <div className="bg-[#4FC3F7]/5 p-6 rounded-[32px] border border-[#4FC3F7]/20 mb-8">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#4FC3F7]/10">
                                  <Sparkles size={24} className="text-[#4FC3F7]" />
                                </div>
                                <div>
                                  <h4 className="font-black text-[#3E2723] text-sm uppercase">Destaque os sabores</h4>
                                  <p className="text-[10px] text-[#3E2723]/60 leading-tight">Escolha abaixo quais produtos estarão no flyer de hoje.</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                {products.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedForFlyer(prev => 
                                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                      );
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${selectedForFlyer.includes(p.id) ? 'bg-white border-[#E63956] shadow-md' : 'bg-transparent border-[#3E2723]/5 grayscale opacity-60'}`}
                                  >
                                    <div className="relative">
                                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                                      {selectedForFlyer.includes(p.id) && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-[#E63956] text-white rounded-full p-0.5 border border-white">
                                          <Check size={8} strokeWidth={4} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black text-[#3E2723] truncate leading-tight uppercase">{p.name}</p>
                                      <p className="text-[9px] font-bold text-[#E63956]">R$ {p.price.toFixed(2)}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-200 mb-8">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
                                  <Star size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                  <h4 className="font-black text-[#3E2723] text-sm uppercase">O que dizem os clientes</h4>
                                  <p className="text-[10px] text-[#3E2723]/60 leading-tight">Escolha os feedbacks que deseja transformar em flyer.</p>
                                </div>
                              </div>

                              <div className="grid gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                {feedbacks.length === 0 ? (
                                  <p className="text-[10px] font-bold text-[#3E2723]/40 text-center py-4">Nenhum feedback disponível.</p>
                                ) : (
                                  feedbacks.map(f => (
                                    <button
                                      key={f.id}
                                      onClick={() => {
                                        setSelectedFeedbacksForFlyer(prev => 
                                          prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                        );
                                      }}
                                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${selectedFeedbacksForFlyer.includes(f.id) ? 'bg-white border-indigo-600 shadow-md' : 'bg-transparent border-[#3E2723]/5 grayscale opacity-60'}`}
                                    >
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedFeedbacksForFlyer.includes(f.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                        {selectedFeedbacksForFlyer.includes(f.id) && <Check size={10} className="text-white" strokeWidth={4} />}
                                      </div>
                                      <div className="min-w-0 flex-grow">
                                        <p className="text-[10px] font-black text-[#3E2723] truncate leading-tight uppercase">{f.userName}</p>
                                        <p className="text-[9px] font-medium text-[#3E2723]/60 truncate italic">"{f.comment}"</p>
                                      </div>
                                      <div className="flex shrink-0">
                                        {[...Array(5)].map((_, i) => (
                                          <Star key={i} size={8} className={i < f.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                                        ))}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            disabled={flyerType === 'menu' ? selectedForFlyer.length === 0 : selectedFeedbacksForFlyer.length === 0}
                            onClick={() => setIsShowingFlyer(true)}
                            className={`w-full text-white py-4 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 ${flyerType === 'menu' ? 'bg-[#E63956] shadow-[#E63956]/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}
                          >
                            <Rocket size={20} />
                            {flyerType === 'menu' ? 'Gerar Flyer do Cardápio' : 'Gerar Flyer de Avaliações'}
                          </button>
                        </section>
                      )}

                      {activeTab === 'config' && (
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-[#3E2723]">
                            <Settings size={18} className="text-slate-600" />
                            <h3 className="font-black uppercase text-sm tracking-widest">Informações da Loja</h3>
                          </div>

                          <form onSubmit={handleUpdateConfig} className="space-y-8 pb-20">
                            {/* Status Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase text-[#3E2723]/40 tracking-[0.2em] border-b border-[#3E2723]/5 pb-2">Status da Operação</h4>
                              <div className="bg-white p-6 rounded-3xl flex items-center justify-between border border-[#3E2723]/5 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-2xl ${storeConfig.isOpen !== false ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <Power size={24} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-[#3E2723]/40 tracking-wider">Disponibilidade</p>
                                    <p className={`text-lg font-black ${storeConfig.isOpen !== false ? 'text-green-600' : 'text-red-600'}`}>
                                      {storeConfig.isOpen !== false ? 'Loja Aberta' : 'Loja Fechada'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentStatus = storeConfig.isOpen !== false;
                                    const newStatus = !currentStatus;
                                    setStoreConfig({...storeConfig, isOpen: newStatus});
                                    try {
                                      await updateStoreConfig({ isOpen: newStatus });
                                    } catch (err) {
                                      alert("Erro ao atualizar status da loja.");
                                    }
                                  }}
                                  className={`w-14 h-8 rounded-full p-1.5 transition-all flex items-center ${storeConfig.isOpen !== false ? 'bg-green-500' : 'bg-red-500'}`}
                                >
                                  <motion.div
                                    layout
                                    className={`w-5 h-5 rounded-full bg-white shadow-md ${storeConfig.isOpen !== false ? 'ml-auto' : ''}`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Contact Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase text-[#3E2723]/40 tracking-[0.2em] border-b border-[#3E2723]/5 pb-2">Dados de Contato</h4>
                              <div className="bg-white p-6 rounded-3xl border border-[#3E2723]/5 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">WhatsApp</label>
                                    <input
                                      type="text"
                                      value={storeConfig.phone}
                                      onChange={e => setStoreConfig({...storeConfig, phone: e.target.value})}
                                      className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                      placeholder="Ex: 5597984493292"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Instagram (usuário)</label>
                                    <input
                                      type="text"
                                      value={storeConfig.instagram}
                                      onChange={e => setStoreConfig({...storeConfig, instagram: e.target.value})}
                                      className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                      placeholder="Ex: rayne_gourmet"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">E-mail Público</label>
                                  <input
                                    type="email"
                                    value={storeConfig.email}
                                    onChange={e => setStoreConfig({...storeConfig, email: e.target.value})}
                                    className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Horário de Funcionamento</label>
                                  <input
                                    type="text"
                                    value={storeConfig.workingHours}
                                    onChange={e => setStoreConfig({...storeConfig, workingHours: e.target.value})}
                                    className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Payment & Location Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase text-[#3E2723]/40 tracking-[0.2em] border-b border-[#3E2723]/5 pb-2">Pagamento e Localização</h4>
                              <div className="bg-white p-6 rounded-3xl border border-[#3E2723]/5 shadow-sm space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Chave PIX</label>
                                  <input
                                    type="text"
                                    value={storeConfig.pixKey}
                                    onChange={e => setStoreConfig({...storeConfig, pixKey: e.target.value})}
                                    className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Link do Google Maps</label>
                                  <input
                                    type="text"
                                    value={storeConfig.googleMapsLink || ''}
                                    onChange={e => setStoreConfig({...storeConfig, googleMapsLink: e.target.value})}
                                    className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold"
                                    placeholder="https://maps.app.goo.gl/..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-[#3E2723]/40">Endereço Físico</label>
                                  <textarea
                                    value={storeConfig.address}
                                    onChange={e => setStoreConfig({...storeConfig, address: e.target.value})}
                                    className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl px-4 py-3 text-sm outline-none font-bold h-24 resize-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full bg-[#3E2723] text-white py-5 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#3E2723]/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                              {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                              ) : (
                                <>
                                  <Save size={20} />
                                  Salvar Todas as Alterações
                                </>
                              )}
                            </button>
                          </form>
                        </section>
                      )}

                      {activeTab === 'pedidos' && (
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-[#3E2723]">
                            <History size={18} className="text-blue-600" />
                            <h3 className="font-black uppercase text-sm tracking-widest">Gestão de Pedidos</h3>
                          </div>
                          
                          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <button
                              onClick={() => setSelectedStatus('all')}
                              className={`shrink-0 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${selectedStatus === 'all' ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-[#F9F9F6] text-[#3E2723]/40 border-[#3E2723]/5'}`}
                            >
                              Todos
                            </button>
                            {(['new', 'production', 'delivery', 'finished', 'cancelled'] as const).map(status => (
                              <button
                                key={status}
                                onClick={() => setSelectedStatus(status)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${selectedStatus === status ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-[#F9F9F6] text-[#3E2723]/40 border-[#3E2723]/5'}`}
                              >
                                {status === 'new' ? 'Novos' : status === 'production' ? 'Em Produção' : status === 'delivery' ? 'Em Entrega' : status === 'finished' ? 'Finalizados' : 'Cancelados'}
                              </button>
                            ))}
                          </div>

                          <div className="grid gap-4">
                            {orders
                              .filter(order => selectedStatus === 'all' || (order.status || 'new') === selectedStatus)
                              .map(order => (
                              <div key={order.id} className="p-5 bg-white border border-[#3E2723]/5 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-[#3E2723]/5 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#3E2723]/40 mb-1">#{order.id.slice(-4)}</p>
                                    <h4 className="font-black text-[#3E2723] uppercase text-xs tracking-wider">{order.customerName}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={order.status || 'new'}
                                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full outline-none border-none cursor-pointer ${
                                        order.status === 'finished' ? 'bg-green-100 text-green-600' :
                                        order.status === 'delivery' ? 'bg-blue-100 text-blue-600' :
                                        order.status === 'production' ? 'bg-amber-100 text-amber-600' :
                                        'bg-red-100 text-red-600'
                                      }`}
                                    >
                                      <option value="new">Novo</option>
                                      <option value="production">Produção</option>
                                      <option value="delivery">Entrega</option>
                                      <option value="finished">Finalizado</option>
                                      <option value="cancelled">Cancelado</option>
                                    </select>
                                    <button 
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Excluir Pedido"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="bg-[#F9F9F6] p-3 rounded-2xl border border-[#3E2723]/5 mb-3">
                                  <div className="flex flex-wrap gap-2">
                                    {order.items.map(item => (
                                      <div key={item.id} className="bg-white border border-[#3E2723]/5 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-[#E63956]">{item.quantity}x</span>
                                        <span className="text-[9px] font-bold text-[#3E2723] uppercase">{item.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] font-bold text-[#3E2723]/40 uppercase tracking-widest">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {order.address.slice(0, 20)}...
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CreditCard size={12} />
                                    {order.paymentMethod}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </main>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isShowingFlyer && isAdmin && (
        <FlyerGenerator 
          type={flyerType}
          selectedProducts={products.filter(p => selectedForFlyer.includes(p.id))}
          selectedFeedbacks={feedbacks.filter(f => selectedFeedbacksForFlyer.includes(f.id))}
          onClose={() => setIsShowingFlyer(false)}
        />
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-[#3E2723]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-[24px] flex items-center justify-center">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                
                <div>
                  <h3 className="text-lg font-black text-[#3E2723] uppercase tracking-tight mb-2">Confirmar Exclusão</h3>
                  <p className="text-[11px] text-[#3E2723]/60 leading-relaxed font-bold uppercase tracking-wider">
                    Deseja excluir <span className="text-red-500">{deleteConfirm.title}</span> permanentemente?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full pt-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-4 rounded-2xl bg-slate-100 text-[#3E2723]/60 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isLoading}
                    className="px-4 py-4 rounded-2xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} strokeWidth={3} />}
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ProductListItem({ product, onUpdatePrice, onUpdateStock, onUpdateField, toggleAvailability, handleDeleteProduct, isAdmin }: { 
  product: Product, 
  onUpdatePrice: (id: string, price: string) => void,
  onUpdateStock: (id: string, stock: string) => void,
  onUpdateField: (id: string, field: string, value: any) => void,
  toggleAvailability: (p: Product) => void,
  handleDeleteProduct: (id: string) => void,
  isAdmin: boolean 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateImage = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      // Delete old image if it exists and it's not base64
      if (product.imagePath && product.imagePath !== 'base64') {
        await deleteImage(product.imagePath);
      }
      
      const timestamp = Date.now();
      const storagePath = `products/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { url, path } = await uploadImage(file, storagePath);
      
      // Update both fields in one call to updateProduct if we can, 
      // but using onUpdateField twice for simplicity with existing architecture
      await onUpdateField(product.id, 'image', url);
      await onUpdateField(product.id, 'imagePath', path);
    } catch (err) {
      console.error("Update image failed:", err);
      alert("Falha ao atualizar imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 bg-[#F9F9F6] rounded-[32px] border border-[#3E2723]/5 group transition-all hover:bg-white hover:shadow-xl hover:shadow-[#3E2723]/5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-grow min-w-0">
          <div className="relative group/img shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-md">
              {isUploading ? (
                <Loader2 size={24} className="text-[#E63956] animate-spin" />
              ) : (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${product.available && (product.stock ?? 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            {(product.stock ?? 0) <= 0 && (
              <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
                <span className="text-[8px] font-black text-[#E63956] uppercase tracking-tighter bg-white px-1 py-0.5 rounded border border-[#E63956]/20 shadow-sm">Esgotado</span>
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 rounded-2xl flex items-center justify-center transition-opacity"
              >
                <Edit3 size={18} className="text-white" />
              </button>
            )}
          </div>
          
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-black text-[#3E2723] text-sm truncate">{product.name}</h4>
              <span className="text-[8px] font-black bg-[#E63956]/5 px-1.5 py-0.5 rounded-full text-[#E63956] uppercase tracking-tighter shrink-0 border border-[#E63956]/10">
                {product.categoria || 'Sem Categoria'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-[#3E2723]/40">R$</span>
                <input
                  type="number"
                  step="0.5"
                  value={product.price}
                  onChange={(e) => onUpdatePrice(product.id, e.target.value)}
                  className="w-12 text-xs font-black text-[#3E2723] bg-transparent focus:bg-white rounded px-1 outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Package size={12} className="text-[#3E2723]/30" />
                <input
                  type="number"
                  value={product.stock || 0}
                  onChange={(e) => onUpdateStock(product.id, e.target.value)}
                  className="w-10 text-xs font-black text-[#3E2723] bg-transparent focus:bg-white rounded px-1 outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3E2723]/5 shrink-0">
          <div className="sm:hidden text-[9px] font-black uppercase tracking-widest text-[#3E2723]/20">Ações</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleAvailability(product)}
              className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${product.available ? 'bg-green-500' : 'bg-[#3E2723]/10'}`}
            >
              <motion.div
                layout
                className={`w-4 h-4 rounded-full bg-white shadow-sm ${product.available ? 'ml-auto' : ''}`}
              />
            </button>
            <button
              onClick={() => handleDeleteProduct(product.id)}
              className="p-2 text-[#3E2723]/20 hover:text-[#E63956] hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-[#3E2723]/5 space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-[#3E2723]/40 mb-1 block">Nome do Produto</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => onUpdateField(product.id, 'name', e.target.value)}
                  className="w-full text-xs font-bold text-[#3E2723] bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#E63956]/10"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-[#3E2723]/40 mb-1 block">Categoria</label>
                <select
                  value={product.categoria}
                  onChange={(e) => onUpdateField(product.id, 'categoria', e.target.value)}
                  className="w-full text-xs font-bold text-[#3E2723] bg-white border border-[#3E2723]/5 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#E63956]/10"
                >
                  <option value="Sabores">Sabores (Geral)</option>
                  <option value="Sabores Especiais">Sabores Especiais</option>
                  <option value="Sabores Premium">Sabores Premium</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase text-[#3E2723]/40 block border-b border-[#3E2723]/5 pb-1">Gerenciar Galeria</label>
                <div className="flex flex-wrap gap-2">
                  {/* Current images in gallery */}
                  {(product.images && product.images.length > 0 ? product.images : [product.image]).map((img, idx) => (
                    <div key={idx} className="relative group w-14 h-14 rounded-xl bg-white border border-[#3E2723]/5 overflow-hidden shadow-sm">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={async () => {
                          const newImages = [...(product.images || [product.image])];
                          const newPaths = [...(product.imagePaths || [product.imagePath || ''])];
                          
                          // If we are deleting the only image, don't allow it
                          if (newImages.length <= 1) {
                            alert("O produto deve ter pelo menos uma foto.");
                            return;
                          }

                          // Delete from storage if possible
                          if (newPaths[idx] && newPaths[idx] !== 'base64') {
                            await deleteImage(newPaths[idx]);
                          }

                          newImages.splice(idx, 1);
                          newPaths.splice(idx, 1);
                          
                          // Update product with new arrays and update main thumbnail to the new first image
                          await updateProduct(product.id, {
                            images: newImages,
                            imagePaths: newPaths,
                            image: newImages[0],
                            imagePath: newPaths[0]
                          });
                        }}
                        className="absolute inset-0 bg-red-500/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add new image to gallery button */}
                  <div className="relative w-14 h-14">
                    {isUploading ? (
                      <div className="w-full h-full rounded-xl bg-white border border-[#3E2723]/5 flex items-center justify-center">
                        <Loader2 size={16} className="text-[#E63956] animate-spin" />
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploading(true);
                            try {
                              const timestamp = Date.now();
                              const storagePath = `products/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                              const { url, path } = await uploadImage(file, storagePath);
                              
                              const currentImages = product.images && product.images.length > 0 ? product.images : [product.image];
                              const currentPaths = product.imagePaths && product.imagePaths.length > 0 ? product.imagePaths : [product.imagePath || ''];
                              
                              await updateProduct(product.id, {
                                images: [...currentImages, url],
                                imagePaths: [...currentPaths, path]
                              });
                            } catch (err) {
                              console.error("Add image to gallery failed:", err);
                              alert("Falha ao adicionar imagem.");
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                          className="hidden"
                          id={`add-to-gallery-${product.id}`}
                        />
                        <label 
                          htmlFor={`add-to-gallery-${product.id}`}
                          className="w-full h-full rounded-xl bg-white border border-dashed border-[#3E2723]/20 flex items-center justify-center text-[#3E2723]/20 hover:text-[#E63956] hover:border-[#E63956]/40 cursor-pointer transition-all"
                        >
                          <Plus size={16} />
                        </label>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[8px] font-black text-[#3E2723]/30 uppercase tracking-tighter">A primeira foto é sempre a capa oficial do produto.</p>
                <div className="pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-full py-2 bg-[#3E2723] text-white text-[9px] font-black uppercase rounded-xl shadow-lg shadow-black/10 active:scale-95 transition-all"
                  >
                    Finalizar Edição
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

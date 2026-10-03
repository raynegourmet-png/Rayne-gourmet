import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Truck, Store, MapPin, CreditCard, Send, Trash2, Ticket, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveOrder } from '../lib/db';
import { CartItem, Order, Coupon, DeliveryArea, OrderStatus } from '../types';
import { User } from 'firebase/auth';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClear: () => void;
  coupons: Coupon[];
  deliveryAreas: DeliveryArea[];
  user: User | null;
  isStoreOpen: boolean;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onClear, coupons, deliveryAreas, user, isStoreOpen }: CartProps) {
  const [customerName, setCustomerName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('pickup');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (user && !customerName) {
      setCustomerName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  const selectedArea = useMemo(() => 
    deliveryAreas.find(a => a.id === selectedAreaId),
  [deliveryAreas, selectedAreaId]);

  const deliveryFee = deliveryType === 'delivery' ? (selectedArea?.fee || 0) : 0;
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (subtotal < appliedCoupon.minOrderValue) return 0;
    
    if (appliedCoupon.type === 'percentage') {
      return subtotal * (appliedCoupon.discount / 100);
    }
    return appliedCoupon.discount;
  }, [appliedCoupon, subtotal]);

  const total = subtotal + deliveryFee - discount;

  const isOrderPossible = isStoreOpen;

  const handleApplyCoupon = () => {
    setCouponError('');
    const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
    
    if (!coupon) {
      setCouponError('Cupom inválido ou expirado.');
      setAppliedCoupon(null);
      return;
    }

    if (subtotal < coupon.minOrderValue) {
      setCouponError(`Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)} necessário.`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponCode('');
  };

  const handleCheckout = async () => {
    setValidationError('');
    if (items.length === 0) return;
    
    if (!customerName.trim()) {
      setValidationError('Por favor, informe seu nome para o pedido.');
      return;
    }

    if (deliveryType === 'delivery') {
      if (!selectedAreaId) {
        setValidationError('Por favor, selecione seu bairro para a entrega.');
        return;
      }
      if (!address.trim()) {
        setValidationError('Por favor, informe o endereço completo (Rua, Número, etc).');
        return;
      }
    }

    if (paymentMethod === 'cash' && needsChange && (!changeAmount || parseFloat(changeAmount) <= total)) {
      setValidationError(`Por favor, informe um valor de troco válido (maior que R$ ${total.toFixed(2)}).`);
      return;
    }

    const itemsList = items
      .map(item => `• ${item.quantity}x ${item.name} (R$ ${(item.price * item.quantity).toFixed(2)})`)
      .join('\n');

    const message = `
*Pedido Rayne Gourmet*
-------------------------
*Cliente:* ${customerName}
*Tipo:* ${deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
${deliveryType === 'delivery' ? `*Bairro:* ${selectedArea?.name}\n*Endereço:* ${address}` : ''}
*Pagamento:* ${paymentMethod.toUpperCase()}${paymentMethod === 'cash' && needsChange ? ` (Troco para R$ ${parseFloat(changeAmount).toFixed(2).replace('.', ',')})` : ''}

*Itens:*
${itemsList}

*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}
${appliedCoupon ? `*Cupom (${appliedCoupon.code}):* -R$ ${discount.toFixed(2).replace('.', ',')}\n` : ''}*Taxa de Entrega:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}
*TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}
-------------------------
`.trim();

    try {
      // Save order to Firestore OBRIGATORIAMENTE before redirect
      const orderData: Omit<Order, 'id'> = {
        userId: user?.uid,
        customerName: customerName.trim(),
        address: deliveryType === 'delivery' ? `${selectedArea?.name} - ${address.trim()}` : 'Retirada na Loja',
        items: items.map(item => ({ ...item })),
        total: parseFloat(total.toFixed(2)),
        deliveryType: deliveryType,
        deliveryFee: deliveryFee,
        paymentMethod: paymentMethod,
        timestamp: Date.now(),
        status: 'new' as OrderStatus,
        needsChange: paymentMethod === 'cash' ? needsChange : false,
        changeAmount: (paymentMethod === 'cash' && needsChange) ? parseFloat(changeAmount) : undefined
      };

      await saveOrder(orderData);
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/5597984493292?text=${encodedMessage}`, '_blank');
      
      onClear();
      onClose();
    } catch (err) {
      console.error("Erro ao processar pedido:", err);
      setValidationError("Houve um erro ao salvar seu pedido. Por favor, tente novamente.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#F9F9F6] shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-[#3E2723]/10 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-[#3E2723]">
                <ShoppingBag size={24} />
                <h2 className="text-xl font-bold">Seu Carrinho</h2>
              </div>
              <button 
                onClick={onClose} 
                aria-label="Fechar carrinho"
                className="p-2 hover:bg-[#F9F9F6] rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <ShoppingBag size={64} className="mb-4" />
                  <p className="text-lg font-medium">Seu carrinho está vazio</p>
                  <button 
                    onClick={onClose}
                    className="mt-4 text-[#E63956] font-bold underline"
                  >
                    Ver sabores disponíveis
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-[#3E2723]/5">
                        <img src={item.image} alt={item.name} loading="lazy" className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-grow">
                          <h4 className="font-bold text-[#3E2723]">{item.name}</h4>
                          <p className="text-sm text-[#E63956] font-medium">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-[#F9F9F6] rounded-full px-2 py-1">
                          <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1"><Minus size={14} /></button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-[#3E2723] border-l-4 border-[#E63956] pl-3">Suas Informações</h3>
                    
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 mb-4">
                        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-amber-900 uppercase mb-1">Atenção</p>
                          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                            Para garantir a entrega correta, preencha todos os campos obrigatórios marcados com <span className="text-red-500 font-black">*</span>.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1 flex justify-between">
                          Seu Nome <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            if (validationError) setValidationError('');
                          }}
                          placeholder="Como podemos te chamar?"
                          className="w-full bg-white border border-[#3E2723]/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E63956]/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1 flex justify-between">
                          Como deseja receber? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setDeliveryType('pickup');
                              if (validationError) setValidationError('');
                            }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all ${deliveryType === 'pickup' ? 'bg-[#E63956] text-white border-[#E63956]' : 'bg-white text-[#3E2723] border-[#3E2723]/10'}`}
                          >
                            <Store size={18} />
                            Retirada
                          </button>
                          <button
                            onClick={() => {
                              setDeliveryType('delivery');
                              if (validationError) setValidationError('');
                            }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all ${deliveryType === 'delivery' ? 'bg-[#E63956] text-white border-[#E63956]' : 'bg-white text-[#3E2723] border-[#3E2723]/10'}`}
                          >
                            <Truck size={18} />
                            Entrega
                          </button>
                        </div>
                      </div>

                      {deliveryType === 'delivery' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1 flex justify-between">
                              Seu Bairro / Região <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedAreaId}
                              onChange={(e) => {
                                setSelectedAreaId(e.target.value);
                                if (validationError) setValidationError('');
                              }}
                              className="w-full bg-white border border-[#3E2723]/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E63956]/20 transition-all font-medium"
                            >
                              <option value="">Selecione sua região...</option>
                              {deliveryAreas.map(area => (
                                <option key={area.id} value={area.id}>
                                  {area.name} - R$ {area.fee.toFixed(2).replace('.', ',')}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1 flex justify-between">
                              Endereço Completo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3.5 text-[#3E2723]/40" size={18} />
                              <textarea
                                value={address}
                                onChange={(e) => {
                                  setAddress(e.target.value);
                                  if (validationError) setValidationError('');
                                }}
                                placeholder="Rua, número e ponto de referência..."
                                rows={2}
                                className="w-full bg-white border border-[#3E2723]/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E63956]/20 transition-all resize-none"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="pt-2">
                        <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1">Cupom de Desconto</label>
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <Ticket className="absolute left-3 top-3.5 text-[#3E2723]/40" size={18} />
                            <input 
                              type="text" 
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="Tem um cupom?"
                              className="w-full bg-white border border-[#3E2723]/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E63956]/20 transition-all uppercase font-bold"
                            />
                          </div>
                          <button 
                            onClick={handleApplyCoupon}
                            disabled={!couponCode}
                            className="bg-[#3E2723] text-white px-6 rounded-xl font-bold hover:bg-[#2D1C1A] transition-all disabled:opacity-50"
                          >
                            Aplicar
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {appliedCoupon && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} 
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="mt-2 flex items-center justify-between bg-green-50 text-green-700 p-3 rounded-xl border border-green-100"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span className="text-sm font-bold">Cupom {appliedCoupon.code} aplicado!</span>
                              </div>
                              <button 
                                onClick={() => setAppliedCoupon(null)}
                                className="text-green-700/50 hover:text-green-700"
                              >
                                <X size={16} />
                              </button>
                            </motion.div>
                          )}
                          {couponError && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100"
                            >
                              <AlertCircle size={16} />
                              <span className="text-sm font-bold">{couponError}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3E2723]/50 uppercase mb-1">Forma de Pagamento</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full bg-white border border-[#3E2723]/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E63956]/20 transition-all font-medium"
                        >
                          <option value="pix">PIX</option>
                          <option value="card">Cartão (Crédito/Débito)</option>
                          <option value="cash">Dinheiro</option>
                        </select>
                      </div>

                      <AnimatePresence>
                        {paymentMethod === 'cash' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white border border-[#3E2723]/10 rounded-2xl p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#3E2723]/60 uppercase">Precisa de troco?</span>
                              <button
                                onClick={() => setNeedsChange(!needsChange)}
                                className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${needsChange ? 'bg-[#E63956]' : 'bg-[#3E2723]/10'}`}
                              >
                                <motion.div
                                  layout
                                  className={`w-4 h-4 rounded-full bg-white shadow-sm ${needsChange ? 'ml-auto' : ''}`}
                                />
                              </button>
                            </div>

                            <AnimatePresence>
                              {needsChange && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-2"
                                >
                                  <label className="block text-[10px] font-black uppercase text-[#3E2723]/40">Troco para quanto?</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#3E2723]/40">R$</span>
                                    <input
                                      type="number"
                                      value={changeAmount}
                                      onChange={(e) => setChangeAmount(e.target.value)}
                                      placeholder="Ex: 50,00"
                                      className="w-full bg-[#F9F9F6] border border-[#3E2723]/5 rounded-xl pl-9 pr-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E63956]/20"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-[#3E2723]/10 space-y-4">
                {!isStoreOpen && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-amber-800">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-tight">
                      No momento estamos fechados. Você pode montar seu carrinho, mas o envio de pedidos está temporariamente desativado.
                    </p>
                  </div>
                )}
                <AnimatePresence>
                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold mb-2"
                    >
                      <AlertCircle size={18} />
                      {validationError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <div className="flex justify-between text-[#3E2723]/70">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {deliveryType === 'delivery' && (
                    <div className="flex justify-between text-[#3E2723]/70">
                      <span>Taxa de Entrega</span>
                      <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-bold italic">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#3E2723] font-extrabold text-xl pt-2 border-t border-[#3E2723]/5">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!isStoreOpen}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isStoreOpen ? 'bg-[#E63956] text-white shadow-[#E63956]/20 hover:bg-[#D81B60]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  <Send size={20} />
                  {isStoreOpen ? 'Finalizar via WhatsApp' : 'Loja Fechada'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Plus({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>; }
function Minus({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>; }

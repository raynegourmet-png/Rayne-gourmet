import { motion } from 'motion/react';
import { Crown, CheckCircle2, Trophy, Award, Medal, Gem, Star, Sparkles, Loader2 } from 'lucide-react';
import { LoyaltyTier } from '../types';

interface ClubRayneProps {
  tiers: LoyaltyTier[];
  userOrdersCount: number;
  isLoggedIn: boolean;
  onJoin?: () => void;
  isLoggingIn?: boolean;
}

export default function ClubRayne({ tiers, userOrdersCount, isLoggedIn, onJoin, isLoggingIn }: ClubRayneProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case 'bronze': return <Medal size={32} />;
      case 'prata': return <Award size={32} />;
      case 'ouro': return <Trophy size={32} />;
      case 'diamante': return <Gem size={32} />;
      default: return <Crown size={32} />;
    }
  };

  const currentTier = [...tiers].reverse().find(t => userOrdersCount >= t.minOrders) || tiers[0];
  const nextTier = tiers.find(t => t.minOrders > userOrdersCount);
  const progress = nextTier 
    ? ((userOrdersCount - (currentTier?.minOrders || 0)) / (nextTier.minOrders - (currentTier?.minOrders || 0))) * 100 
    : 100;

  return (
    <section id="club" className="mt-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="flex items-center gap-2 text-[#E63956] font-bold uppercase tracking-widest text-sm mb-2">
          <Crown size={16} />
          <span>Fidelidade</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-[#3E2723] mb-4">Club Rayne</h2>
        <p className="text-[#3E2723]/60 max-w-xl mb-12">
          Quanto mais você saboreia nossos dindins, mais vantagens você ganha. 
          Suba de nível e desbloqueie benefícios exclusivos!
        </p>

        {!isLoggedIn && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full mb-16 bg-[#3E2723] rounded-[40px] p-8 md:p-16 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-[#3E2723]/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E63956] rounded-full -mr-32 -mt-32 blur-3xl opacity-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4FC3F7] rounded-full -ml-32 -mb-32 blur-3xl opacity-10" />
            
            <div className="relative z-10 text-center md:text-left flex-grow">
              <h3 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Faça parte do <br/><span className="text-[#E63956]">Club Rayne</span></h3>
              <p className="text-xl md:text-2xl text-white/70 font-medium max-w-lg leading-relaxed">
                "Onde cada dindin se transforma em uma recompensa exclusiva."
              </p>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onJoin}
              disabled={isLoggingIn}
              className="relative z-10 bg-white text-[#3E2723] px-10 py-5 rounded-full font-black text-xl hover:bg-[#E63956] hover:text-white transition-all shadow-xl flex items-center gap-3 group disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin text-[#E63956]" />
              ) : (
                <Sparkles className="text-[#E63956] group-hover:text-white transition-colors" />
              )}
              {isLoggingIn ? 'Entrando...' : 'Quero Participar'}
            </motion.button>
          </motion.div>
        )}

        {isLoggedIn && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-white rounded-[32px] border border-[#3E2723]/5 shadow-xl w-full max-w-lg"
          >
            <div className="flex justify-between items-end mb-4">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-[#3E2723]/40 tracking-widest mb-1">Seu Status</p>
                <h4 className="text-xl font-black text-[#3E2723]" style={{ color: currentTier?.color }}>{currentTier?.name}</h4>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#3E2723]">{userOrdersCount}</p>
                <p className="text-[10px] font-black uppercase text-[#3E2723]/40">Pedidos</p>
              </div>
            </div>
            
            <div className="h-4 bg-[#F9F9F6] rounded-full overflow-hidden border border-[#3E2723]/5 p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: currentTier?.color }}
              />
            </div>
            
            {nextTier && (
              <p className="mt-3 text-[10px] font-bold text-[#3E2723]/40 uppercase tracking-tighter">
                Faltam {nextTier.minOrders - userOrdersCount} pedidos para o nível <span style={{ color: nextTier.color }}>{nextTier.name}</span>
              </p>
            )}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className="bg-white rounded-[32px] p-8 shadow-sm border border-[#3E2723]/5 flex flex-col relative overflow-hidden group"
          >
            <div 
              className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-110 duration-500"
              style={{ color: tier.color }}
            >
              {getIcon(tier.id)}
            </div>

            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
              style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
            >
              {getIcon(tier.id)}
            </div>

            <h3 className="text-2xl font-bold text-[#3E2723] mb-1">{tier.name}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-6">
              A partir de {tier.minOrders} pedidos
            </p>

            <ul className="space-y-3 flex-grow">
              {tier.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#3E2723]/70">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-[#3E2723]/5 text-center">
              <span className="text-[10px] font-bold text-[#E63956] uppercase tracking-tighter">Status Atual</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

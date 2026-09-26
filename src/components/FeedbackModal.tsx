import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { addFeedback } from '../lib/db';
import { User } from 'firebase/auth';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function FeedbackModal({ isOpen, onClose, user }: FeedbackModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsLoading(true);
    try {
      await addFeedback({
        userId: user?.uid,
        userName: user?.displayName || 'Cliente Anônimo',
        rating,
        comment: comment.trim(),
        timestamp: Date.now()
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setComment('');
        setRating(5);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star size={24} className="fill-white" />
                <h2 className="text-xl font-bold">Sua Avaliação</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Obrigado pelo Feedback!</h3>
                  <p className="text-sm text-slate-500">Sua opinião é muito importante para nós.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Como foi sua experiência?</p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRating(num)}
                          className="p-1 transition-transform active:scale-90"
                        >
                          <Star 
                            size={36} 
                            className={`${num <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Seu Comentário</label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte-nos o que achou dos nossos produtos..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !comment.trim()}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <>
                        <Send size={20} />
                        Enviar Avaliação
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

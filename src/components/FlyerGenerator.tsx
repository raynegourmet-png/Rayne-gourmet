import { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Sparkles, X, Star, Quote, MessageSquare } from 'lucide-react';
import { Product, Feedback } from '../types';

interface FlyerGeneratorProps {
  type: 'menu' | 'feedbacks';
  selectedProducts?: Product[];
  selectedFeedbacks?: Feedback[];
  onClose: () => void;
}

export default function FlyerGenerator({ type, selectedProducts = [], selectedFeedbacks = [], onClose }: FlyerGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateFlyer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (Stories proportion 9:16)
    canvas.width = 1080;
    canvas.height = 1920;

    if (type === 'menu') {
      renderMenuFlyer(ctx, canvas);
    } else {
      renderFeedbackFlyer(ctx, canvas);
    }
  };

  const renderMenuFlyer = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Background - Cream
    ctx.fillStyle = '#F9F9F6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Shapes
    ctx.beginPath();
    ctx.arc(canvas.width, 0, 400, 0, Math.PI * 2);
    ctx.fillStyle = '#E6395615';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, canvas.height, 500, 0, Math.PI * 2);
    ctx.fillStyle = '#4FC3F715';
    ctx.fill();

    // Title Section
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E63956';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('DELÍCIAS DO DIA', canvas.width / 2, 200);

    ctx.fillStyle = '#3E2723';
    ctx.font = 'black 120px sans-serif';
    ctx.fillText('Rayne Gourmet', canvas.width / 2, 340);

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 150, 400);
    ctx.lineTo(canvas.width / 2 + 150, 400);
    ctx.strokeStyle = '#4FC3F7';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Product List
    const headerBottom = 450;
    const footerTop = canvas.height - 350;
    const availableHeight = footerTop - headerBottom;
    const maxProducts = 12;
    const productCount = selectedProducts.length;
    const baseLineHeight = productCount > 10 ? 85 : 110;
    const totalListHeight = productCount * baseLineHeight;
    const startY = headerBottom + (availableHeight - totalListHeight) / 2 + 50;
    
    ctx.textAlign = 'left';
    selectedProducts.slice(0, maxProducts).forEach((product, index) => {
      const y = startY + (index * baseLineHeight);
      const fontSize = productCount > 10 ? 40 : 48;
      
      ctx.beginPath();
      ctx.arc(140, y - 12, 10, 0, Math.PI * 2);
      ctx.fillStyle = product.categoria.includes('1') ? '#E63956' : '#4FC3F7';
      ctx.fill();

      ctx.fillStyle = '#3E2723';
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      const priceText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
      const priceWidth = ctx.measureText(priceText).width;
      const maxNameWidth = canvas.width - 200 - priceWidth - 100;
      
      let nameToDraw = product.name;
      if (ctx.measureText(nameToDraw).width > maxNameWidth) {
        while (ctx.measureText(nameToDraw + '...').width > maxNameWidth && nameToDraw.length > 0) {
          nameToDraw = nameToDraw.slice(0, -1);
        }
        nameToDraw += '...';
      }
      ctx.fillText(nameToDraw, 180, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#3E2723';
      ctx.font = `black ${fontSize}px sans-serif`;
      ctx.fillText(priceText, canvas.width - 140, y);
      ctx.textAlign = 'left';
    });

    renderFooter(ctx, canvas);
  };

  const renderFeedbackFlyer = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Background - Soft Indigo/Purple
    ctx.fillStyle = '#EEF2FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Shapes
    ctx.beginPath();
    ctx.arc(canvas.width, 200, 500, 0, Math.PI * 2);
    ctx.fillStyle = '#4F46E510';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, canvas.height - 200, 400, 0, Math.PI * 2);
    ctx.fillStyle = '#4F46E508';
    ctx.fill();

    // Title Section
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4F46E5';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('O QUE DIZEM NOSSOS CLIENTES', canvas.width / 2, 200);

    ctx.fillStyle = '#3E2723';
    ctx.font = 'black 120px sans-serif';
    ctx.fillText('Feedback & Carinho', canvas.width / 2, 340);

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 200, 400);
    ctx.lineTo(canvas.width / 2 + 200, 400);
    ctx.strokeStyle = '#E63956';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Feedback List
    const headerBottom = 500;
    const footerTop = canvas.height - 350;
    const availableHeight = footerTop - headerBottom;
    const maxFeedbacks = 4;
    const feedbackCount = selectedFeedbacks.length;
    
    const cardHeight = Math.min(300, (availableHeight / Math.min(feedbackCount, maxFeedbacks)) - 40);
    const startY = headerBottom + 50;

    selectedFeedbacks.slice(0, maxFeedbacks).forEach((feedback, index) => {
      const y = startY + (index * (cardHeight + 40));
      const cardWidth = canvas.width - 200;
      const cardX = 100;

      // Card Background
      ctx.shadowColor = 'rgba(0,0,0,0.05)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, cardX, y, cardWidth, cardHeight, 40);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // User Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4F46E5';
      ctx.font = 'black 48px sans-serif';
      ctx.fillText(feedback.userName, cardX + 60, y + 80);

      // Stars
      const starX = cardX + 60;
      const starY = y + 120;
      for (let i = 0; i < 5; i++) {
        drawStar(ctx, starX + (i * 45), starY, 15, 7, 5, i < feedback.rating ? '#FBBF24' : '#E2E8F0');
      }

      // Comment
      ctx.fillStyle = '#3E2723';
      ctx.font = 'italic 36px sans-serif';
      const maxTextWidth = cardWidth - 120;
      wrapText(ctx, `"${feedback.comment}"`, cardX + 60, y + 200, maxTextWidth, 45);
    });

    renderFooter(ctx, canvas);
  };

  const renderFooter = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3E2723';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('PEÇA JÁ O SEU!', canvas.width / 2, canvas.height - 300);

    ctx.font = '50px sans-serif';
    ctx.fillText('(97) 9 8449 3292', canvas.width / 2, canvas.height - 220);
    ctx.fillText('@rayne_gourmet', canvas.width / 2, canvas.height - 140);
    
    ctx.fillStyle = '#E63956';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText('Rayne Gourmet - Dindin Gourmet', canvas.width / 2, canvas.height - 60);
  };

  // Helper functions for canvas
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  };

  useEffect(() => {
    generateFlyer();
  }, [type, selectedProducts, selectedFeedbacks]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `flyer-${type}-rayne-gourmet-${new Date().toLocaleDateString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-[#3E2723]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
      >
        {/* Preview Area */}
        <div className="flex-1 bg-[#F9F9F6] p-6 flex flex-col items-center justify-center overflow-auto">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white max-h-full">
            <canvas
              ref={canvasRef}
              className="max-h-[70vh] w-auto h-auto object-contain"
            />
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full md:w-80 bg-white border-l border-[#3E2723]/5 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[#3E2723]">Visualizar Flyer</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F9F9F6] rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-grow overflow-auto mb-8">
            <p className="text-sm text-[#3E2723]/60 mb-4">
              {type === 'menu' 
                ? `Sabores selecionados (${selectedProducts.length}):`
                : `Avaliações selecionadas (${selectedFeedbacks.length}):`
              }
            </p>
            <div className="space-y-2">
              {type === 'menu' ? (
                selectedProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm font-bold text-[#3E2723] p-2 bg-[#F9F9F6] rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-[#E63956]"></div>
                    {p.name}
                  </div>
                ))
              ) : (
                selectedFeedbacks.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-sm font-bold text-[#3E2723] p-2 bg-indigo-50 rounded-xl">
                    <MessageSquare size={12} className="text-indigo-600" />
                    {f.userName}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleDownload}
              className={`w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg ${type === 'menu' ? 'bg-[#E63956] shadow-[#E63956]/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}
            >
              <Download size={20} />
              Baixar Flyer (PNG)
            </button>
            
            <div className="flex items-center gap-3 p-4 bg-[#4FC3F7]/10 rounded-2xl border border-[#4FC3F7]/20">
              <Sparkles className="text-[#4FC3F7]" size={20} />
              <p className="text-xs text-[#3E2723]/70 font-medium leading-tight">
                Pronto para compartilhar no seu Instagram Stories!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

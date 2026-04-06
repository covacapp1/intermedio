interface AdsProps {
  onBack: () => void;
  onPurchase: () => void;
  hasAdFree: boolean;
}

export function Ads({ onBack, onPurchase, hasAdFree }: AdsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
        >
          ← Volver
        </button>

        <div className="text-center mb-8">
          <h1 
            className="text-5xl font-bold text-[#F5DEB3] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mb-4"
            style={{ 
              fontFamily: 'serif',
              textShadow: '3px 3px 0 #654321',
            }}
          >
            📢 ANUNCIOS
          </h1>
        </div>

        {hasAdFree ? (
          // Already purchased
          <div 
            className="bg-[#228B22] border-4 border-[#006400] rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">✓</div>
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'serif' }}>
                ¡Gracias por tu compra!
              </h2>
              <p className="text-white/90 text-lg">
                Ya no verás anuncios en el juego. Disfruta de la experiencia completa.
              </p>
            </div>
          </div>
        ) : (
          // Purchase card
          <div 
            className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
            style={{
              background: 'linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)',
            }}
          >
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>

            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🚫📺</div>
              <h2 className="text-3xl font-bold text-[#F5DEB3] mb-4" style={{ fontFamily: 'serif' }}>
                Juega Sin Anuncios
              </h2>
              <p className="text-[#D2B48C] text-lg mb-6">
                Disfruta de una experiencia ininterrumpida en todas tus partidas
              </p>
              
              <div className="bg-black/30 rounded-lg p-6 mb-6">
                <div className="text-[#D4AF37] text-5xl font-bold mb-2" style={{ fontFamily: 'serif' }}>
                  USD $6.99
                </div>
                <p className="text-[#D2B48C]">Pago único - Sin renovaciones</p>
              </div>

              <ul className="text-left text-[#F5DEB3] space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-[#D4AF37]">✓</span>
                  Sin interrupciones durante el juego
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#D4AF37]">✓</span>
                  Experiencia premium
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#D4AF37]">✓</span>
                  Compra única, disfruta para siempre
                </li>
              </ul>
            </div>

            <button
              onClick={onPurchase}
              className="w-full py-5 bg-gradient-to-b from-[#00A8E8] to-[#0077B6] text-white font-bold text-2xl border-4 border-[#654321] rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:from-[#00D4FF] hover:to-[#00A8E8] transition-all transform hover:scale-105 active:scale-95 relative"
              style={{ fontFamily: 'serif' }}
            >
              <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-white/50"></div>
              <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-white/50"></div>
              <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-white/50"></div>
              <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-white/50"></div>
              PAGAR CON MERCADOPAGO
            </button>

            <p className="text-center text-[#D2B48C] mt-4 text-sm">
              Pago seguro procesado por MercadoPago
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

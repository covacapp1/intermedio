import { useState } from "react";
import { X, Coins, Loader2, Store } from "lucide-react";
import { SHOP_PACKS } from "../services/campaignEngine";
import { formatMoney } from "../utils/deck";
import { formatArs } from "../utils/economy";

interface CampaignShopProps {
  balance: number;
  onClose: () => void;
  onBuyPack: (amount: number) => Promise<string | null>;
  onOpenMarketplace: () => void;
}

export function CampaignShop({ balance, onClose, onBuyPack, onOpenMarketplace }: CampaignShopProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (amount: number) => {
    setLoading(true);
    setError(null);
    try {
      const failure = await onBuyPack(amount);
      if (failure) {
        setError(failure);
        setLoading(false);
      }
    } catch {
      setError("No pudimos iniciar el pago. Intentá de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#8B4513] border-4 border-[#D4AF37] rounded-xl p-5 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-[#D2B48C] hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🪙</div>
          <h2 className="text-xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            ¡Te quedaste sin INT!
          </h2>
          <p className="text-[#D2B48C] text-sm mt-1">
            Tenés <strong className="text-[#F5DEB3]">{formatMoney(balance)}</strong>. Comprá más para seguir jugando:
          </p>
        </div>

        <div className="space-y-3">
          {SHOP_PACKS.map((amount) => (
            <button
              key={amount}
              onClick={() => void handleBuy(amount)}
              disabled={loading}
              className="w-full flex items-center justify-between bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-2 border-[#654321] rounded-lg px-4 py-3 text-[#3E2723] font-bold hover:from-[#FFD700] hover:to-[#D4AF37] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                {formatMoney(amount)}
              </span>
              <span className="text-xs font-normal opacity-80">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatArs(amount)}
              </span>
            </button>
          ))}

          <button
            onClick={onOpenMarketplace}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#A0792A] to-[#8B6914] border-2 border-[#654321] rounded-lg px-4 py-3 text-[#F5DEB3] font-bold hover:from-[#B8941E] hover:to-[#A0792A] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Store className="w-5 h-5" />
            MARKETPLACE
            <span className="text-xs font-normal opacity-80">(más paquetes)</span>
          </button>
        </div>

        {error ? <p className="text-red-400 text-xs text-center mt-3">{error}</p> : null}

        <p className="text-center text-[#D2B48C] text-[11px] mt-4">
          Los INT van a tu Campaña. Pago seguro por Mercado Pago (1 ARS = 1 INT).
        </p>
      </div>
    </div>
  );
}

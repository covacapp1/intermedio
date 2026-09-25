import { X, Coins } from "lucide-react";
import { SHOP_PACKS } from "../services/campaignEngine";
import { formatMoney } from "../utils/deck";

interface CampaignShopProps {
  balance: number;
  onClose: () => void;
  onBuy: (amount: number) => void;
}

export function CampaignShop({ balance, onClose, onBuy }: CampaignShopProps) {
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
            Tenés <strong className="text-[#F5DEB3]">{formatMoney(balance)}</strong>. Elegí cuántos querés:
          </p>
        </div>

        <div className="space-y-3">
          {SHOP_PACKS.map((amount) => (
            <button
              key={amount}
              onClick={() => onBuy(amount)}
              className="w-full flex items-center justify-between bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-2 border-[#654321] rounded-lg px-4 py-3 text-[#3E2723] font-bold hover:from-[#FFD700] hover:to-[#D4AF37] transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                {formatMoney(amount)}
              </span>
              <span className="text-xs uppercase tracking-wide">Agregar</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[#D2B48C] text-[11px] mt-4">
          Los INT de campaña son gratuitos y no se mezclan con tu balance.
        </p>
      </div>
    </div>
  );
}

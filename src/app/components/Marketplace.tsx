import { IntIcon } from "./IntIcon";
import { formatInt } from "../utils/economy";

interface MarketplaceProps {
  userBalance: number;
  onBack: () => void;
}

const PACKAGES = [
  { amount: 1000, label: "1.000 INT", color: "from-[#8B6914] to-[#A0791A]" },
  { amount: 2000, label: "2.000 INT", color: "from-[#8B6914] to-[#B8941E]" },
  { amount: 5000, label: "5.000 INT", color: "from-[#B8941E] to-[#D4AF37]" },
  { amount: 10000, label: "10.000 INT", color: "from-[#D4AF37] to-[#FFD700]" },
  { amount: 20000, label: "20.000 INT", color: "from-[#FFD700] to-[#FFDF4F]" },
];

export function Marketplace({ userBalance, onBack }: MarketplaceProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto pt-4">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 text-sm font-semibold text-[#F5DEB3] border-2 border-[#D4AF37] rounded bg-[#654321] hover:bg-[#7d5a2e] transition-colors"
        >
          Volver
        </button>

        <div className="text-center mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F5DEB3] mb-2"
            style={{
              fontFamily: "serif",
              textShadow: "3px 3px 0 #654321",
            }}
          >
            MARKETPLACE
          </h1>
          <p className="text-[#D2B48C] text-sm sm:text-base">Comprá monedas INT para seguir jugando</p>
          <div className="flex items-center justify-center gap-2 mt-3 p-3 rounded-lg border border-[#D4AF37]/50 bg-[#654321]/60">
            <IntIcon className="h-5 w-5 text-[12px] text-[#3E2723]" />
            <span className="text-[#FFD700] font-bold text-lg">Tu saldo: {formatInt(userBalance)}</span>
          </div>
        </div>

        <div className="space-y-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              disabled
              className={`w-full py-4 sm:py-5 bg-gradient-to-b ${pkg.color} text-[#3E2723] font-bold text-lg sm:text-xl border-4 border-[#654321] rounded-lg shadow-[0_6px_16px_rgba(0,0,0,0.5)] opacity-60 cursor-not-allowed relative overflow-hidden`}
              style={{ fontFamily: "serif" }}
            >
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#3E2723]" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#3E2723]" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#3E2723]" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#3E2723]" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <IntIcon className="h-5 w-5 text-[12px] text-[#3E2723]" />
                {pkg.label}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-[#D2B48C]/70 text-xs mt-6">
          Próximamente habilitaremos las compras
        </p>
      </div>
    </div>
  );
}

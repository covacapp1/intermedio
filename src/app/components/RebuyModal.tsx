import { formatMoney } from "../utils/deck";
import { useEffect, useState } from "react";

interface RebuyModalProps {
  isOpen: boolean;
  buyInAmount: number;
  userBalance: number;
  rebuyDeadline?: number;
  onRebuy: () => void;
  onLeave: () => void;
}

export function RebuyModal({ isOpen, buyInAmount, userBalance, rebuyDeadline, onRebuy, onLeave }: RebuyModalProps) {
  if (!isOpen) return null;

  const canAfford = userBalance >= buyInAmount;
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!rebuyDeadline) return;

    const updateCountdown = () => {
      const now = Date.now();
      const deadline = rebuyDeadline;
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        onLeave();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [rebuyDeadline, onLeave]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-md bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
        style={{
          background: 'linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)',
        }}
      >
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">💸</div>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#F5DEB3] mb-2" style={{ fontFamily: 'serif' }}>
            ¡Te quedaste sin fichas!
          </h3>
          <p className="text-[#D2B48C] text-sm sm:text-base">
            Recarga fichas para continuar en la mesa
          </p>
          {rebuyDeadline && timeLeft > 0 && (
            <div className="mt-3 text-[#FFD700] font-bold text-lg">
              Tiempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          )}
          {timeLeft === 0 && (
            <div className="mt-3 text-red-400 font-bold text-lg">
              ¡Tiempo agotado!
            </div>
          )}
        </div>

        <div className="bg-black/30 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-[#F5DEB3]">
            <span>Costo de recarga:</span>
            <span className="font-bold text-[#FFD700]">{formatMoney(buyInAmount)}</span>
          </div>
          <div className="flex justify-between text-[#D2B48C]">
            <span>Tu saldo disponible:</span>
            <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
              {formatMoney(userBalance)}
            </span>
          </div>
          {canAfford && (
            <div className="flex justify-between text-[#90EE90] pt-2 border-t border-[#D4AF37]/30">
              <span>Saldo después de recarga:</span>
              <span className="font-bold">{formatMoney(userBalance - buyInAmount)}</span>
            </div>
          )}
        </div>

        {!canAfford && (
          <div className="bg-red-900/40 border-2 border-red-600/50 rounded-lg p-3 mb-4 text-center">
            <p className="text-red-200 text-sm">
              ⚠️ Saldo insuficiente. Debes abandonar la mesa e ir al cajero para cargar dinero.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {canAfford && (
            <button
              onClick={onRebuy}
              className="py-3 bg-gradient-to-b from-[#228B22] to-[#006400] text-white font-bold text-lg border-3 border-[#654321] rounded-lg shadow-lg hover:from-[#32CD32] hover:to-[#228B22] transition-all transform hover:scale-105 active:scale-95"
              style={{ fontFamily: 'serif' }}
            >
              💰 RECARGAR {formatMoney(buyInAmount)}
            </button>
          )}
          <button
            onClick={onLeave}
            className="py-3 bg-gradient-to-b from-[#DC143C] to-[#8B0000] text-white font-bold text-lg border-3 border-[#654321] rounded-lg shadow-lg hover:from-[#FF1493] hover:to-[#DC143C] transition-all transform hover:scale-105 active:scale-95"
            style={{ fontFamily: 'serif' }}
          >
            🚪 ABANDONAR MESA
          </button>
        </div>

        <p className="text-center text-[#D2B48C] mt-4 text-xs">
          {canAfford 
            ? "Se descontará de tu saldo y se agregará a tu stack en la mesa"
            : "Debes abandonar esta mesa y cargar dinero en el cajero"}
        </p>
      </div>
    </div>
  );
}

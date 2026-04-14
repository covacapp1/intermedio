import { formatInt } from "../utils/economy";

interface JoinTableModalProps {
  isOpen: boolean;
  tableName: string;
  buyIn: number;
  userBalance: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function JoinTableModal({
  isOpen,
  tableName,
  buyIn,
  userBalance,
  onConfirm,
  onClose,
}: JoinTableModalProps) {
  if (!isOpen) return null;

  const canAfford = userBalance >= buyIn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="relative w-full max-w-md rounded-lg border-4 border-[#654321] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
        style={{
          background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
        }}
      >
        <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-[#D4AF37]"></div>

        <h2 className="mb-2 text-center text-3xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
          ENTRAR A LA MESA
        </h2>
        <p className="mb-6 text-center text-sm text-[#D2B48C]">
          Para entrar en <span className="font-bold text-[#F5DEB3]">{tableName}</span> debes aportar el buy-in fijo al pozo.
        </p>

        <div className="space-y-4">
          <div className="rounded border border-[#D4AF37]/30 bg-black/20 p-4">
            <p className="text-sm text-[#D2B48C]">Monto obligatorio de ingreso</p>
            <p className="mt-1 text-3xl font-bold text-[#FFD700]">{formatInt(buyIn)}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              INT con los que vas a ingresar
            </label>
            <input
              type="text"
              value={formatInt(buyIn)}
              readOnly
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none"
            />
            <p className="mt-2 text-xs text-[#D2B48C]">
              Todos los jugadores ingresan con este mismo monto y ese valor se suma al pozo de la mesa.
            </p>
          </div>

          <div className="rounded border border-[#D4AF37]/30 bg-black/20 p-3 text-sm text-[#D2B48C]">
            <p>
              <strong className="text-[#F5DEB3]">Tu saldo:</strong> {formatInt(userBalance)}
            </p>
            <p className="mt-1">
              <strong className="text-[#F5DEB3]">Saldo restante:</strong> {formatInt(Math.max(0, userBalance - buyIn))}
            </p>
          </div>

          {!canAfford && (
            <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">
              No tienes suficiente saldo para entrar a esta mesa.
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border-3 border-[#654321] bg-gradient-to-b from-[#8B7355] to-[#5D4E37] py-3 font-bold text-white shadow-lg transition-all hover:from-[#A0826D] hover:to-[#8B7355] active:scale-95"
            style={{ fontFamily: "serif" }}
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford}
            className="rounded-lg border-3 border-[#654321] bg-gradient-to-b from-[#D4AF37] to-[#B8941E] py-3 font-bold text-[#3E2723] shadow-lg transition-all hover:from-[#FFD700] hover:to-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            style={{ fontFamily: "serif" }}
          >
            ACEPTAR
          </button>
        </div>
      </div>
    </div>
  );
}

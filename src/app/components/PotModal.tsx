import { formatMoney } from "../utils/deck";

interface PotModalProps {
  isOpen: boolean;
  potValue: number;
  onContinue: () => void;
  onClose: () => void;
}

export function PotModal({ isOpen, potValue, onContinue, onClose }: PotModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 grid place-items-center bg-black/65 p-4 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[min(420px,100%)] bg-gradient-to-br from-[#13261e] to-[#0c1713] border border-[#2f4f3f] rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
        <h3>El pozo llegó a {formatMoney(potValue)}</h3>
        <p className="mb-4">¿Desean continuar agregando el monto inicial por jugador?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={onContinue}
            className="border-none rounded-lg px-4 py-3 font-bold cursor-pointer bg-gradient-to-br from-[#d09a2a] to-[#ffd166] text-[#1d1d1d] transition-all hover:translate-y-[-1px] hover:brightness-110"
          >
            Continuar jugando
          </button>
          <button
            onClick={onClose}
            className="border-none rounded-lg px-4 py-3 font-bold cursor-pointer bg-[#d64545] text-white transition-all hover:translate-y-[-1px] hover:brightness-110"
          >
            Cerrar mesa
          </button>
        </div>
      </div>
    </div>
  );
}

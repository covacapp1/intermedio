import { useState } from "react";

interface CreateTableModalProps {
  onClose: () => void;
  onCreate: (tableName: string, buyIn: number, initialStack: number, maxPlayers: number) => void;
}

export function CreateTableModal({ onClose, onCreate }: CreateTableModalProps) {
  const [tableName, setTableName] = useState("");
  const [buyIn, setBuyIn] = useState(1000);
  const [initialStack, setInitialStack] = useState(2000);
  const [maxPlayers, setMaxPlayers] = useState(3);

  const handleCreate = () => {
    if (tableName.trim()) {
      onCreate(tableName.trim(), buyIn, initialStack, maxPlayers);
    } else {
      alert("Por favor, ingresa un nombre para la mesa");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="relative w-full max-w-md rounded-lg border-4 border-[#654321] bg-[#8B4513] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
        style={{
          background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
        }}
      >
        <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-[#D4AF37]"></div>

        <h2 className="mb-6 text-center text-3xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
          CREAR MESA
        </h2>

        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              Nombre de la Mesa
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              maxLength={30}
              placeholder="Ej: Mesa del Sheriff"
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              Buy-in Obligatorio al Pozo
            </label>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min="100"
              step="100"
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              INT con los que ingresas a jugar
            </label>
            <input
              type="number"
              value={initialStack}
              onChange={(e) => setInitialStack(Number(e.target.value))}
              min="100"
              step="100"
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              Cantidad de Jugadores
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value={3}>3 jugadores</option>
              <option value={6}>6 jugadores</option>
            </select>
          </div>

          <div className="rounded border border-[#D4AF37]/30 bg-black/20 p-3">
            <p className="text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Jugadores:</strong> hasta {maxPlayers} por mesa
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Buy-in:</strong> todos los jugadores deben ingresar con {buyIn} INT
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Tu stack inicial:</strong> entraras a jugar con {initialStack} INT
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Descuento total al crear:</strong> {buyIn + initialStack} INT
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Inicio:</strong> Automatico cuando se llena la mesa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border-3 border-[#654321] bg-gradient-to-b from-[#8B7355] to-[#5D4E37] py-3 font-bold text-white shadow-lg transition-all hover:from-[#A0826D] hover:to-[#8B7355] active:scale-95"
            style={{ fontFamily: "serif" }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleCreate}
            className="rounded-lg border-3 border-[#654321] bg-gradient-to-b from-[#D4AF37] to-[#B8941E] py-3 font-bold text-[#3E2723] shadow-lg transition-all hover:from-[#FFD700] hover:to-[#D4AF37] active:scale-95"
            style={{ fontFamily: "serif" }}
          >
            CREAR
          </button>
        </div>
      </div>
    </div>
  );
}

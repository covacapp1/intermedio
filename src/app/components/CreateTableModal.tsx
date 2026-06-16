import { useState } from "react";

interface CreateTableModalProps {
  onClose: () => void;
  onCreate: (
    tableName: string,
    buyIn: number,
    initialStack: number,
    maxPlayers: number,
    gameMode: "pvp" | "vs_ai"
  ) => void;
}

export function CreateTableModal({ onClose, onCreate }: CreateTableModalProps) {
  const [tableName, setTableName] = useState("");
  const [buyIn, setBuyIn] = useState("1000");
  const [initialStack, setInitialStack] = useState("2000");
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [gameMode, setGameMode] = useState<"pvp" | "vs_ai">("pvp");

  const handleCreate = () => {
    const parsedBuyIn = Number(buyIn);
    const parsedInitialStack = Number(initialStack);

    if (!Number.isFinite(parsedBuyIn) || parsedBuyIn <= 0 || !Number.isFinite(parsedInitialStack) || parsedInitialStack <= 0) {
      alert("Ingresa montos validos para crear la mesa");
      return;
    }

    if (tableName.trim()) {
      onCreate(tableName.trim(), parsedBuyIn, parsedInitialStack, gameMode === "vs_ai" ? 2 : maxPlayers, gameMode);
    } else {
      alert("Por favor, ingresa un nombre para la mesa");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6">
      <div
        className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border-4 border-[#654321] bg-[#8B4513] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)] md:p-6"
        style={{
          background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
        }}
      >
        <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-[#D4AF37]"></div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-[#D4AF37]"></div>

        <h2 className="mb-4 text-center text-3xl font-bold text-[#F5DEB3] md:mb-6" style={{ fontFamily: "serif" }}>
          CREAR MESA
        </h2>

        <div className="mb-4 grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 md:mb-6 md:grid-cols-2 md:gap-6">
          <div className="space-y-4">
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
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setBuyIn(e.target.value)}
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
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setInitialStack(e.target.value)}
              min="100"
              step="100"
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            />
            </div>

            <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              Modo de Juego
            </label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value as "pvp" | "vs_ai")}
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="pvp">Multijugador</option>
              <option value="vs_ai">1 jugador vs IA</option>
            </select>
            </div>

            <div>
            <label className="mb-2 block text-sm font-semibold text-[#F5DEB3]">
              Cantidad de Jugadores
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={gameMode === "vs_ai"}
              className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value={2}>2 jugadores</option>
              <option value={3}>3 jugadores</option>
              <option value={6}>6 jugadores</option>
            </select>
            </div>
          </div>

          <div className="rounded border border-[#D4AF37]/30 bg-black/20 p-3 md:p-4">
            <p className="text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Modo:</strong> {gameMode === "vs_ai" ? "1 jugador vs IA" : "Multijugador"}
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Jugadores:</strong> {gameMode === "vs_ai" ? 2 : maxPlayers} por mesa
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Pozo obligatorio:</strong> cada jugador aporta {Number(buyIn) || 0} INT al centro de la mesa
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Tu stack inicial:</strong> entraras a jugar con {Number(initialStack) || 0} INT como saldo personal
            </p>
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Descuento total al crear:</strong> {(Number(buyIn) || 0) + (Number(initialStack) || 0)} INT
            </p>
            {gameMode === "vs_ai" ? (
              <p className="mt-1 text-sm text-[#D2B48C]">
                <strong className="text-[#F5DEB3]">IA:</strong> la caja admin aporta su propio fondo para la IA.
              </p>
            ) : null}
            <p className="mt-1 text-sm text-[#D2B48C]">
              <strong className="text-[#F5DEB3]">Inicio:</strong> {gameMode === "vs_ai" ? "Inmediato" : "Automatico cuando se llena la mesa"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
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

import { useState } from "react";

interface LobbyProps {
  onStartTable: (code: string, buyIn: number) => void;
  message: string;
}

export function Lobby({ onStartTable, message }: LobbyProps) {
  const [buyIn, setBuyIn] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handlePlayNow = () => {
    onStartTable("", Number(buyIn) || 0);
  };

  const handleCreateTable = () => {
    onStartTable("CREATE", Number(buyIn) || 0);
  };

  const handleJoinTable = () => {
    onStartTable(joinCode.trim().toUpperCase(), Number(buyIn) || 0);
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="m-0">Intermedio</h1>
        <p className="mt-1 mb-0 text-zinc-400">Demo frontend: 1 jugador + 2 IA</p>
      </header>

      <div className="bg-gradient-to-br from-[#13261e] to-[#173226] border border-[#2f4f3f] rounded-xl p-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
        <label htmlFor="buyInInput" className="block mb-1.5 text-zinc-400">
          Monto fijo por mesa
        </label>
        <input
          id="buyInInput"
          type="number"
          min="100"
          step="100"
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value)}
          className="w-full px-3 py-2 border border-[#2f4f3f] rounded-lg bg-[#0f1f19] text-white focus:outline focus:outline-2 focus:outline-[#3a7d5a]"
        />
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <button
          onClick={handlePlayNow}
          className="border-none rounded-lg px-4 py-3 font-bold cursor-pointer bg-gradient-to-br from-[#d09a2a] to-[#ffd166] text-[#1d1d1d] transition-all hover:translate-y-[-1px] hover:brightness-110"
        >
          Jugar Ahora
        </button>
        <button
          onClick={handleCreateTable}
          className="border-none rounded-lg px-4 py-3 font-bold cursor-pointer bg-[#395946] text-white transition-all hover:translate-y-[-1px] hover:brightness-110"
        >
          Crear Mesa Privada
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#13261e] to-[#173226] border border-[#2f4f3f] rounded-xl p-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
        <label htmlFor="joinCodeInput" className="block mb-1.5 text-zinc-400">
          Unirse con Código
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            id="joinCodeInput"
            type="text"
            maxLength={6}
            placeholder="ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="px-3 py-2 border border-[#2f4f3f] rounded-lg bg-[#0f1f19] text-white focus:outline focus:outline-2 focus:outline-[#3a7d5a]"
          />
          <button
            onClick={handleJoinTable}
            className="border-none rounded-lg px-4 py-3 font-bold cursor-pointer bg-[#395946] text-white transition-all hover:translate-y-[-1px] hover:brightness-110"
          >
            Unirse
          </button>
        </div>
      </div>

      {message && <p className="text-zinc-400 min-h-[1.4rem] mt-1">{message}</p>}
    </section>
  );
}

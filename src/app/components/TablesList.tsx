import { Clock, DollarSign, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { MultiplayerHelp } from "./MultiplayerHelp";
import { formatInt } from "../utils/economy";

export interface TableInfo {
  id: string;
  name: string;
  buyIn: number;
  currentPlayers: number;
  maxPlayers: number;
  code: string;
  createdAt: number;
}

interface TablesListProps {
  tables: TableInfo[];
  onJoinTable: (tableId: string) => void;
  onBack: () => void;
}

export function TablesList({ tables, onJoinTable, onBack }: TablesListProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [searchCode, setSearchCode] = useState("");

  const availableTables = useMemo(() => {
    const normalizedSearch = searchCode.trim().toUpperCase();

    return tables
      .filter((table) => table.currentPlayers < table.maxPlayers)
      .filter((table) => {
        if (!normalizedSearch) return true;
        return table.code.toUpperCase().includes(normalizedSearch) || table.name.toUpperCase().includes(normalizedSearch);
      });
  }, [searchCode, tables]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="mx-auto max-w-5xl pt-8">
        <button
          onClick={onBack}
          className="mb-6 rounded border-2 border-[#D4AF37] bg-[#654321] px-4 py-2 text-[#F5DEB3] transition-colors hover:bg-[#7d5a2e]"
        >
          Volver al Saloon
        </button>

        <div className="mb-8 text-center">
          <h1
            className="mb-4 text-5xl font-bold text-[#F5DEB3] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] md:text-6xl"
            style={{
              fontFamily: "serif",
              textShadow: "3px 3px 0 #654321",
            }}
          >
            LOBBY
          </h1>
          <p className="text-lg text-[#D2B48C]">Busca por codigo o entra a una mesa disponible</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-green-600/50 bg-green-600/20 px-4 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            <span className="font-semibold text-green-400">Multijugador en tiempo real</span>
          </div>
          <div className="mt-3">
            <button
              onClick={() => setShowHelp(true)}
              className="text-sm text-[#D4AF37] underline transition-colors hover:text-[#FFD700]"
            >
              Como funciona el multijugador
            </button>
          </div>
        </div>

        <div
          className="mb-6 rounded-lg border-4 border-[#654321] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.55)]"
          style={{
            background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
          }}
        >
          <div className="grid gap-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#654321]" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Buscar por codigo de mesa o nombre"
                className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] py-3 pl-10 pr-4 text-[#3E2723] placeholder-[#8B7355] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </label>
          </div>
        </div>

        {availableTables.length === 0 ? (
          <div
            className="relative rounded-lg border-4 border-[#654321] p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            style={{
              background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
            }}
          >
            <div className="mb-4 text-6xl">+</div>
            <h3 className="mb-2 text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
              No hay mesas en el lobby
            </h3>
            <p className="text-[#D2B48C]">
              {searchCode ? "No encontramos ese codigo." : "Se el primero en crear una mesa nueva."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableTables.map((table) => (
              <TableCard key={table.id} table={table} onJoin={() => onJoinTable(table.id)} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-[#D2B48C]">
            {availableTables.length} {availableTables.length === 1 ? "mesa visible en lobby" : "mesas visibles en lobby"}
          </p>
        </div>
      </div>

      <MultiplayerHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

function TableCard({ table, onJoin }: { table: TableInfo; onJoin: () => void }) {
  const isFull = table.currentPlayers >= table.maxPlayers;
  const spotsLeft = table.maxPlayers - table.currentPlayers;
  const timeElapsed = Math.floor((Date.now() - table.createdAt) / 60000);

  return (
    <div
      className="group relative rounded-lg border-4 border-[#654321] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-all hover:border-[#D4AF37] hover:shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
      style={{
        background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)",
      }}
    >
      <div className="absolute -left-0.5 -top-0.5 h-6 w-6 border-l-2 border-t-2 border-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100"></div>
      <div className="absolute -right-0.5 -top-0.5 h-6 w-6 border-r-2 border-t-2 border-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100"></div>
      <div className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-2 border-l-2 border-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100"></div>
      <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-2 border-r-2 border-[#D4AF37] opacity-0 transition-opacity group-hover:opacity-100"></div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="text-3xl">+</div>
            <div>
              <h3 className="text-xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                {table.name}
              </h3>
              <p className="font-mono text-xs text-[#D2B48C]">Codigo: {table.code}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded border border-[#D4AF37]/30 bg-black/20 px-3 py-1.5">
              <DollarSign className="h-4 w-4 text-[#D4AF37]" />
              <div>
                <p className="text-xs text-[#D2B48C]">Buy-in</p>
                <p className="text-sm font-bold text-[#F5DEB3]">{formatInt(table.buyIn)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded border border-[#D4AF37]/30 bg-black/20 px-3 py-1.5">
              <Users className="h-4 w-4 text-[#D4AF37]" />
              <div>
                <p className="text-xs text-[#D2B48C]">Jugadores</p>
                <p className="text-sm font-bold text-[#F5DEB3]">
                  {table.currentPlayers}/{table.maxPlayers}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded border border-[#D4AF37]/30 bg-black/20 px-3 py-1.5">
              <Clock className="h-4 w-4 text-[#D4AF37]" />
              <div>
                <p className="text-xs text-[#D2B48C]">Esperando</p>
                <p className="text-sm font-bold text-[#F5DEB3]">{timeElapsed === 0 ? "Ahora" : `${timeElapsed}m`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-48">
          <button
            onClick={onJoin}
            disabled={isFull}
            className="relative w-full rounded-lg border-3 border-[#654321] bg-gradient-to-b from-[#228B22] to-[#006400] py-3 text-lg font-bold text-white shadow-lg transition-all hover:from-[#32CD32] hover:to-[#228B22] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: "serif" }}
          >
            {isFull ? (
              "LOBBY LLENO"
            ) : (
              <>
                UNIRSE
                <span className="mt-0.5 block text-xs opacity-90">
                  {spotsLeft} {spotsLeft === 1 ? "lugar libre" : "lugares libres"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

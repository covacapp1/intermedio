import { useState } from "react";
import { Menu, X } from "lucide-react";
import { IntIcon } from "./IntIcon";
import { formatInt } from "../utils/economy";

interface WesternHomeProps {
  userName: string;
  userBalance: number;
  isAdmin: boolean;
  onNavigate: (view: "profile" | "tables" | "createTable" | "cashier" | "ads" | "admin" | "marketplace") => void;
  onLogout: () => void;
}

export function WesternHome({ userName, userBalance, isAdmin, onNavigate, onLogout }: WesternHomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4 relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="absolute top-4 right-4 z-50 bg-[#654321] p-2.5 sm:p-3 rounded border-2 border-[#D4AF37] shadow-lg hover:bg-[#7d5a2e] transition-colors"
      >
        {menuOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5DEB3]" />
        ) : (
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5DEB3]" />
        )}
      </button>

      {menuOpen && (
        <div className="absolute top-16 sm:top-20 right-4 z-40 bg-[#8B4513] border-4 border-[#654321] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.7)] w-56 sm:w-64 overflow-hidden">
          <div className="bg-[#654321] px-4 py-2 border-b-2 border-[#D4AF37]">
            <p className="text-[#F5DEB3] font-semibold text-sm sm:text-base truncate">{userName}</p>
            <p className="flex items-center gap-2 text-[#D2B48C] text-xs sm:text-sm">
              <IntIcon className="h-4 w-4 text-[10px] text-[#3E2723]" />
              <span>Saldo: {formatInt(userBalance)}</span>
            </p>
          </div>
          {isAdmin ? <MenuEntry label="Cajero" onClick={() => onNavigate("cashier")} /> : null}
          <MenuEntry label="Marketplace" onClick={() => onNavigate("marketplace")} />
          <MenuEntry label="Anuncios" onClick={() => onNavigate("ads")} />
          {isAdmin ? <MenuEntry label="Admin" onClick={() => onNavigate("admin")} /> : null}
          <button
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2.5 sm:py-3 text-sm sm:text-base text-[#F5DEB3] hover:bg-[#A0522D] transition-colors font-semibold"
          >
            Salir
          </button>
        </div>
      )}

      <div className="relative z-10 max-w-2xl mx-auto pt-16 sm:pt-20 flex-1 w-full">
        <div className="text-center mb-12 sm:mb-16">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#F5DEB3] drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] mb-4"
            style={{
              fontFamily: "serif",
              textShadow: "4px 4px 0 #654321, -2px -2px 0 #654321, 2px -2px 0 #654321, -2px 2px 0 #654321",
            }}
          >
            INTERMEDIO
          </h1>
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <p className="text-[#D2B48C] text-base sm:text-lg md:text-xl">Card Game</p>
            <div className="h-1 w-16 sm:w-20 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <WesternButton onClick={() => onNavigate("profile")}>PERFIL</WesternButton>
          <WesternButton onClick={() => onNavigate("tables")}>LOBBY</WesternButton>
          <WesternButton onClick={() => onNavigate("createTable")}>CREAR MESA</WesternButton>
        </div>
      </div>

      <footer
        className="relative z-10 mt-10 sm:mt-14 pb-6 text-center text-xs sm:text-sm text-[#F5DEB3]/85"
        style={{ fontFamily: "serif" }}
      >
        <p>
          © 2026{" "}
          <a
            href="https://covacweb.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline decoration-[#D4AF37] underline-offset-4 transition-colors hover:text-white"
          >
            covacApp
          </a>
          . All rights reserved.
        </p>
      </footer>

      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
    </div>
  );
}

function MenuEntry({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 sm:py-3 text-sm sm:text-base text-[#F5DEB3] hover:bg-[#654321] transition-colors border-b border-[#654321] font-semibold"
    >
      {label}
    </button>
  );
}

function WesternButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 sm:py-5 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-xl sm:text-2xl border-4 border-[#654321] rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:from-[#FFD700] hover:to-[#D4AF37] transition-all transform hover:scale-105 active:scale-95 relative overflow-hidden group"
      style={{ fontFamily: "serif" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700" />
      <div className="absolute top-1 left-1 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-[#3E2723]" />
      <div className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-[#3E2723]" />
      <div className="absolute bottom-1 left-1 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-[#3E2723]" />
      <div className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-[#3E2723]" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

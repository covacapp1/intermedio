import { ArrowLeft, Lock, CheckCircle, Coins, Wallet, ScrollText, ShoppingBag } from "lucide-react";
import type { CampaignState, CampaignLocation } from "../types/campaign";
import { formatMoney } from "../utils/deck";
import { getTownDef, townCompleted } from "../services/campaignEngine";

interface CampaignMapProps {
  campaignState: CampaignState;
  pendingIncome: number;
  completionRewardClaimed: boolean;
  onBack: () => void;
  onSelectLocation: (location: CampaignLocation) => void;
  onClaimIncome: () => void;
  onShowRules: () => void;
  onOpenShop: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  facil: "#2d9a68",
  normal: "#D4AF37",
  dificil: "#e67e22",
  experto: "#e74c3c",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: "Fácil",
  normal: "Normal",
  dificil: "Difícil",
  experto: "Experto",
};

export function CampaignMap({
  campaignState,
  pendingIncome,
  completionRewardClaimed,
  onBack,
  onSelectLocation,
  onClaimIncome,
  onShowRules,
  onOpenShop,
}: CampaignMapProps) {
  const dailyIncome = campaignState.ownedProperties.reduce((sum, key) => {
    const sep = key.indexOf(":");
    if (sep === -1) return sum;
    const town = getTownDef(key.slice(0, sep));
    const prop = town?.properties.find((p) => p.id === key.slice(sep + 1));
    return sum + (prop?.income ?? 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-3xl mx-auto pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#F5DEB3] font-semibold hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {pendingIncome > 0 ? (
              <button
                onClick={onClaimIncome}
                className="flex items-center gap-1.5 bg-green-700 border-2 border-green-500 rounded-lg px-3 py-1.5 text-white font-bold text-xs animate-pulse hover:bg-green-600 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                Cobrar {formatMoney(pendingIncome)}
              </button>
            ) : null}
            <button
              onClick={onOpenShop}
              className="flex items-center gap-1.5 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-2 border-[#654321] rounded-lg px-3 py-1.5 text-[#3E2723] font-bold text-xs hover:from-[#FFD700] hover:to-[#D4AF37] transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Comprar INT
            </button>
            <button
              onClick={onShowRules}
              className="flex items-center gap-1.5 bg-[#3E2723] border-2 border-[#D4AF37] rounded-lg px-3 py-1.5 text-[#F5DEB3] font-bold text-xs hover:bg-[#4E3723] transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Reglas
            </button>
            <div className="flex items-center gap-2 bg-[#3E2723] border-2 border-[#D4AF37] rounded-lg px-3 py-1.5">
              <Coins className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#F5DEB3] font-bold text-sm">{formatMoney(campaignState.balance)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F5DEB3] mb-1" style={{ fontFamily: "serif" }}>
            Campaña
          </h1>
          <p className="text-[#D2B48C] text-sm">
            {campaignState.gamesPlayed} partidas — {campaignState.gamesWon} ganadas
          </p>
        </div>

        <div
          className={`mb-6 rounded-lg border-2 px-4 py-3 text-center shadow-lg ${
            completionRewardClaimed
              ? "border-green-400 bg-green-900/50"
              : "border-[#D4AF37] bg-black/50"
          }`}
        >
          <p className="text-xs sm:text-sm font-bold text-[#F5DEB3]">
            {completionRewardClaimed
              ? "🏆 ¡Campaña completada! Ya cobraste los 5000 INT en tu Caja de Multijugador."
              : "🏆 Premio: al completar los 8 pueblos ganás 5000 INT en tu Caja de Multijugador."}
          </p>
        </div>

        <div className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)] mb-6">
          <div
            className="relative w-full rounded-xl overflow-hidden border-2 border-[#5f3f1c]"
            style={{
              height: "350px",
              background:
                "radial-gradient(ellipse at 50% 22%, #ECCC93 0%, #DCB87A 42%, #C69D5D 72%, #A87F48 100%)",
              boxShadow: "inset 0 0 55px rgba(74,45,22,0.55)",
            }}
          >
            {/* textura de papel viejo */}
            <div
              className="absolute inset-0 opacity-[0.10] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(101,67,33,0.6) 3px, rgba(101,67,33,0.6) 4px), repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(101,67,33,0.4) 5px, rgba(101,67,33,0.4) 6px)",
              }}
            />

            {/* sol del viejo oeste */}
            <div
              className="absolute right-5 top-4 w-16 h-16 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, #FBE7A8 0%, #F0C65A 55%, rgba(240,198,90,0) 72%)",
                boxShadow: "0 0 34px 14px rgba(240,198,90,0.35)",
              }}
            />

            {/* dunas y mesas al fondo */}
            <svg
              viewBox="0 0 720 90"
              preserveAspectRatio="none"
              className="absolute bottom-0 left-0 w-full h-[72px] pointer-events-none"
            >
              <path
                d="M0 90 L0 58 Q70 38 140 55 Q200 30 260 52 Q330 34 400 54 Q470 32 540 52 Q610 36 660 50 Q695 44 720 52 L720 90 Z"
                fill="#96632F"
                opacity="0.5"
              />
              <path
                d="M0 90 L0 70 Q90 52 170 68 Q250 50 330 66 Q420 50 500 68 Q580 54 650 66 Q690 60 720 66 L720 90 Z"
                fill="#7A4E26"
                opacity="0.8"
              />
            </svg>

            {/* cactus izquierdo */}
            <svg viewBox="0 0 44 64" className="absolute left-4 bottom-3 w-7 h-10 sm:w-9 sm:h-12 pointer-events-none">
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 62 V14" stroke="#33481F" strokeWidth="13" />
                <path d="M22 62 V14" stroke="#4E6B2F" strokeWidth="9" />
                <path d="M22 44 H12 V30" stroke="#33481F" strokeWidth="10" />
                <path d="M22 44 H12 V30" stroke="#4E6B2F" strokeWidth="6.5" />
                <path d="M22 38 H32 V26" stroke="#33481F" strokeWidth="10" />
                <path d="M22 38 H32 V26" stroke="#4E6B2F" strokeWidth="6.5" />
              </g>
            </svg>

            {/* cactus derecho */}
            <svg viewBox="0 0 44 64" className="absolute right-6 bottom-4 w-6 h-9 sm:w-7 sm:h-10 pointer-events-none opacity-90">
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 62 V16" stroke="#33481F" strokeWidth="13" />
                <path d="M22 62 V16" stroke="#4E6B2F" strokeWidth="9" />
                <path d="M22 46 H12 V34" stroke="#33481F" strokeWidth="10" />
                <path d="M22 46 H12 V34" stroke="#4E6B2F" strokeWidth="6.5" />
              </g>
            </svg>

            {/* brújula */}
            <svg viewBox="0 0 64 64" className="absolute left-3 top-3 w-10 h-10 sm:w-12 sm:h-12 opacity-75 pointer-events-none">
              <circle cx="32" cy="34" r="24" fill="#E8D9B5" stroke="#6B4226" strokeWidth="3" opacity="0.85" />
              <circle cx="32" cy="34" r="18" fill="none" stroke="#6B4226" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <path d="M32 14 L36 34 L32 31 L28 34 Z" fill="#8B2F1F" />
              <path d="M32 54 L28 34 L32 37 L36 34 Z" fill="#3E2723" />
              <circle cx="32" cy="34" r="3" fill="#6B4226" />
            </svg>

            {/* marco interior estilo cuerda */}
            <div className="absolute inset-1.5 rounded-md border border-dashed border-[#5f3f1c]/40 pointer-events-none" />

            {/* sendero entre pueblos */}
            {campaignState.locations.map((loc, i) => {
              if (i < campaignState.locations.length - 1) {
                const next = campaignState.locations[i + 1];
                return (
                  <svg key={`line-${loc.id}`} className="absolute inset-0 w-full h-full pointer-events-none">
                    <line
                      x1={`${loc.x}%`} y1={`${loc.y}%`}
                      x2={`${next.x}%`} y2={`${next.y}%`}
                      stroke={loc.unlocked && next.unlocked ? "#8B2F1F" : "#5f3f1c"}
                      strokeWidth="3" strokeDasharray="9 7" strokeLinecap="round" opacity="0.65"
                    />
                  </svg>
                );
              }
              return null;
            })}

            {campaignState.locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => loc.unlocked && onSelectLocation(loc)}
                disabled={!loc.unlocked}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 ${
                  loc.unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl border-[3px] shadow-[0_3px_0_rgba(62,39,20,0.55),0_6px_12px_rgba(0,0,0,0.35)] ${
                    loc.completed
                      ? "border-[#1f6b47]"
                      : loc.unlocked
                      ? "border-[#5f3f1c]"
                      : "border-gray-600"
                  }`}
                  style={{
                    background: loc.completed
                      ? "linear-gradient(135deg, #2d9a68, #1f6b47)"
                      : loc.unlocked
                      ? "linear-gradient(135deg, #F0D070, #D4AF37 55%, #B8941E)"
                      : "linear-gradient(135deg, #8a8a8a, #555)",
                  }}
                >
                  {loc.completed ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  ) : !loc.unlocked ? (
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                  ) : (
                    <span>{loc.icon}</span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-[#F5DEB3] bg-[#3E2723] border border-[#D4AF37]/60 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {loc.name}
                </span>
                <span
                  className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ background: DIFFICULTY_COLORS[loc.difficulty] }}
                >
                  {(() => {
                    const town = getTownDef(loc.id);
                    const done = townCompleted(campaignState, loc.id);
                    if (!town) return "";
                    return done ? "✓ Conquistado" : `${town.play.length} lugares`;
                  })()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
          <h3 className="text-[#F5DEB3] font-bold mb-3" style={{ fontFamily: "serif" }}>Dificultades</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["facil", "normal", "dificil", "experto"] as const).map((d) => (
              <div key={d} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: DIFFICULTY_COLORS[d] }} />
                <span className="text-[#D2B48C] text-xs">{DIFFICULTY_LABELS[d]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#654321] flex items-center justify-between text-xs">
            <span className="text-[#D2B48C]">
              🏠 Propiedades: <strong className="text-[#F5DEB3]">{campaignState.ownedProperties.length}</strong>
            </span>
            <span className="text-[#D2B48C]">
              Rinde: <strong className="text-green-400">{formatMoney(dailyIncome)} / día</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

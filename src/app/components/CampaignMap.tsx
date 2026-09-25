import { ArrowLeft, Lock, CheckCircle, Coins, Wallet, ScrollText } from "lucide-react";
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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#F5DEB3] font-semibold hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex items-center gap-2">
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
              background: "linear-gradient(135deg, #8B6914 0%, #A0792A 30%, #8B6914 60%, #6B4E12 100%)",
            }}
          >
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#5f3f1c" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {campaignState.locations.map((loc, i) => {
              if (i < campaignState.locations.length - 1) {
                const next = campaignState.locations[i + 1];
                return (
                  <svg key={`line-${loc.id}`} className="absolute inset-0 w-full h-full pointer-events-none">
                    <line
                      x1={`${loc.x}%`} y1={`${loc.y}%`}
                      x2={`${next.x}%`} y2={`${next.y}%`}
                      stroke={loc.unlocked && next.unlocked ? "#D4AF37" : "#5f3f1c"}
                      strokeWidth="2" strokeDasharray="6 4" opacity="0.5"
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
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl border-2 shadow-lg ${
                    loc.completed ? "border-green-400" : loc.unlocked ? "border-[#D4AF37]" : "border-gray-500"
                  }`}
                  style={{
                    background: loc.completed
                      ? "linear-gradient(135deg, #2d9a68, #1f6b47)"
                      : loc.unlocked
                      ? "linear-gradient(135deg, #D4AF37, #B8941E)"
                      : "linear-gradient(135deg, #555, #333)",
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
                <span className="text-[9px] sm:text-[10px] font-bold text-[#F5DEB3] bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap">
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

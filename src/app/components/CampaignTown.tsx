import { ArrowLeft, Coins, Lock, CheckCircle, Wallet, FastForward } from "lucide-react";
import type { CampaignLocation, CampaignState, TownDef } from "../types/campaign";
import { formatMoney } from "../utils/deck";
import { SKIP_UNLOCK_PRICE } from "../services/campaignEngine";

interface CampaignTownProps {
  location: CampaignLocation;
  townDef: TownDef;
  campaignState: CampaignState;
  pendingIncome: number;
  onBack: () => void;
  onPlay: (buildingId: string) => void;
  onBuyProperty: (propertyId: string) => void;
  onClaimIncome: () => void;
  onSkipUnlock: () => void;
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

export function CampaignTown({
  location,
  townDef,
  campaignState,
  pendingIncome,
  onBack,
  onPlay,
  onBuyProperty,
  onClaimIncome,
  onSkipUnlock,
}: CampaignTownProps) {
  const completedCount = townDef.play.filter((b) =>
    campaignState.completedBuildings.includes(`${townDef.townId}:${b.id}`)
  ).length;
  const ownedCount = townDef.properties.filter((p) =>
    campaignState.ownedProperties.includes(`${townDef.townId}:${p.id}`)
  ).length;

  const locIdx = campaignState.locations.findIndex((l) => l.id === location.id);
  const nextLocation =
    locIdx !== -1 && locIdx + 1 < campaignState.locations.length
      ? campaignState.locations[locIdx + 1]
      : null;
  const showSkip = Boolean(nextLocation && !nextLocation.unlocked && !location.completed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-3xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#F5DEB3] font-semibold hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Mapa
          </button>
          <div className="flex items-center gap-3">
            {pendingIncome > 0 ? (
              <button
                onClick={onClaimIncome}
                className="flex items-center gap-1.5 bg-green-700 border-2 border-green-500 rounded-lg px-3 py-1.5 text-white font-bold text-xs animate-pulse hover:bg-green-600 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                Cobrar {formatMoney(pendingIncome)}
              </button>
            ) : null}
            <div className="flex items-center gap-2 bg-[#3E2723] border-2 border-[#D4AF37] rounded-lg px-3 py-1.5">
              <Coins className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#F5DEB3] font-bold text-sm">{formatMoney(campaignState.balance)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            {location.icon} {location.name}
          </h1>
          <p className="text-[#D2B48C] text-sm mt-1">
            Lugares: <strong className="text-[#D4AF37]">{completedCount}/{townDef.play.length}</strong>
            {" · "}
            Casas: <strong className="text-[#D4AF37]">{ownedCount}/{townDef.properties.length}</strong>
            {location.completed ? " — ¡Pueblo conquistado!" : ""}
          </p>
          {!location.completed ? (
            <p className="text-[#D2B48C] text-xs mt-1">
              Ganá en todos los lugares y comprá todas las casas para conquistarlo
            </p>
          ) : null}
        </div>

        <div className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)] mb-5">
          <h2 className="text-[#F5DEB3] font-bold mb-1" style={{ fontFamily: "serif" }}>
            🎯 Lugares para jugar
          </h2>
          <p className="text-[#D2B48C] text-xs mb-3">Cada victoria te da <strong className="text-green-400">+100 INT</strong> de premio</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {townDef.play.map((building) => {
              const done = campaignState.completedBuildings.includes(`${townDef.townId}:${building.id}`);
              const canPlay = campaignState.balance >= location.buyIn;
              return (
                <button
                  key={building.id}
                  onClick={() => onPlay(building.id)}
                  disabled={!canPlay}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    done
                      ? "border-green-500 bg-green-900/40"
                      : canPlay
                      ? "border-[#D4AF37] bg-black/30 hover:bg-[#D4AF37]/20 hover:scale-[1.03] cursor-pointer"
                      : "border-gray-600 bg-black/30 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="text-3xl sm:text-4xl mb-1">{building.icon}</div>
                  <p className="text-[#F5DEB3] font-bold text-xs sm:text-sm leading-tight">{building.name}</p>
                  <span
                    className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-1"
                    style={{ background: DIFFICULTY_COLORS[building.difficulty] }}
                  >
                    {DIFFICULTY_LABELS[building.difficulty]}
                  </span>
                  <p className="mt-1.5 text-[10px] font-bold">
                    {done ? (
                      <span className="text-green-400 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Completado
                      </span>
                    ) : canPlay ? (
                      <span className="text-[#D4AF37]">Jugar — {formatMoney(location.buyIn)}</span>
                    ) : (
                      <span className="text-red-400">Sin fondos</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
          <h2 className="text-[#F5DEB3] font-bold mb-1" style={{ fontFamily: "serif" }}>
            🏠 Propiedades en venta
          </h2>
          <p className="text-[#D2B48C] text-xs mb-3">Rinden plata todos los días (24 h)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {townDef.properties.map((prop) => {
              const key = `${townDef.townId}:${prop.id}`;
              const owned = campaignState.ownedProperties.includes(key);
              const canBuy = campaignState.balance >= prop.price;
              return (
                <div
                  key={prop.id}
                  className={`rounded-xl border-2 p-3 text-center ${
                    owned ? "border-green-500 bg-green-900/40" : "border-[#D4AF37]/60 bg-black/30"
                  }`}
                >
                  <div className="text-3xl mb-1">{prop.icon}</div>
                  <p className="text-[#F5DEB3] font-bold text-sm">{prop.name}</p>
                  <p className="text-[#D2B48C] text-xs">
                    Rinde <strong className="text-green-400">{formatMoney(prop.income)}</strong> / día
                  </p>
                  {owned ? (
                    <p className="mt-2 text-green-400 text-xs font-bold flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Tuya
                    </p>
                  ) : (
                    <button
                      onClick={() => onBuyProperty(prop.id)}
                      disabled={!canBuy}
                      className={`mt-2 w-full py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${
                        canBuy
                          ? "bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-[#654321] text-[#3E2723] hover:from-[#FFD700] hover:to-[#D4AF37]"
                          : "bg-gray-600 border-gray-700 text-gray-300 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      Comprar — {formatMoney(prop.price)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[#D2B48C] text-xs">
            <Lock className="w-3 h-3" />
            Ganá en todos los lugares y comprá todas las casas para conquistar el pueblo
          </div>
        </div>

        {showSkip ? (
          <div className="mt-5 bg-[#8B4513] border-4 border-[#654321] rounded-lg p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)] text-center">
            <p className="text-[#D2B48C] text-xs mb-2">
              ¿Querés saltar la conquista? Desbloqueá <strong className="text-[#F5DEB3]">{nextLocation?.name}</strong> pagando:
            </p>
            <button
              onClick={onSkipUnlock}
              disabled={campaignState.balance < SKIP_UNLOCK_PRICE}
              className={`inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border-2 font-bold text-sm transition-all ${
                campaignState.balance >= SKIP_UNLOCK_PRICE
                  ? "bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-[#654321] text-[#3E2723] hover:from-[#FFD700] hover:to-[#D4AF37] active:scale-[0.98]"
                  : "bg-gray-600 border-gray-700 text-gray-300 opacity-60 cursor-not-allowed"
              }`}
            >
              <FastForward className="w-4 h-4" />
              Desbloquear — {formatMoney(SKIP_UNLOCK_PRICE)}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

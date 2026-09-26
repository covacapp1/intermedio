import type { ReactNode } from "react";
import { X, Swords, Map, Home, Coins, Trophy } from "lucide-react";
import { MATCH_BUY_IN, WIN_PRIZE, ROUND_ANTE, SKIP_UNLOCK_PRICE, CAMPAIGN_COMPLETION_REWARD, TOWN_DEFS } from "../services/campaignEngine";

interface CampaignRulesProps {
  onClose: () => void;
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-black/30 border-2 border-[#D4AF37]/30 rounded-lg p-3">
      <h3 className="flex items-center gap-2 text-[#F5DEB3] font-bold text-sm mb-2" style={{ fontFamily: "serif" }}>
        {icon}
        {title}
      </h3>
      <div className="text-[#D2B48C] text-[12.5px] leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

export function CampaignRules({ onClose }: CampaignRulesProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#8B4513] border-4 border-[#D4AF37] rounded-xl p-5 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-[#D2B48C] hover:text-white transition-colors z-10"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="text-4xl mb-1">📜</div>
          <h2 className="text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            Reglas de la Campaña
          </h2>
        </div>

        <div className="overflow-y-auto pr-1 space-y-3 pb-2">
          <Section icon={<Map className="w-4 h-4" />} title="Objetivo">
            <p>
              Hay <strong className="text-[#F5DEB3]">{TOWN_DEFS.length} pueblos</strong> en el mapa, desde el Salón del
              Polvo hasta la Residencia del Gobernador. Empezás con <strong className="text-[#F5DEB3]">500 INT</strong> y
              cada pueblo se desbloquea al conquistar el anterior.
            </p>
            <p>
              <strong className="text-[#F5DEB3]">Premio final:</strong> al conquistar los {TOWN_DEFS.length} pueblos
              ganás <strong className="text-green-400">{CAMPAIGN_COMPLETION_REWARD} INT</strong> para tu Caja de
              Multijugador (se acredita una sola vez, con confetis 🎉).
            </p>
          </Section>

          <Section icon={<Swords className="w-4 h-4" />} title="Cómo se juega cada partido">
            <p>
              Cada lugar de juego tiene una entrada de <strong className="text-[#F5DEB3]">{MATCH_BUY_IN} INT</strong>. Te
              sentás con {MATCH_BUY_IN} INT al lado de <strong className="text-[#F5DEB3]">5 rivales</strong> y la banca.
            </p>
            <p>Se reparten 40 cartas españolas (del 1 al 7, 10, 11 y 12):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Cada ronda</strong>, todos los de la mesa (vos y las{" "}
                <strong className="text-[#F5DEB3]">5 IA</strong>) pagan{" "}
                <strong className="text-[#F5DEB3]">{ROUND_ANTE} INT</strong> que van directo al{" "}
                <strong className="text-[#F5DEB3]">pozo</strong>. La banca empieza con un pozo de 500 INT y se
                rellena con esas fichas de ronda.
              </li>
              <li>A cada jugador le salen <strong>2 cartas boca arriba</strong>.</li>
              <li>
                <strong>Apostás</strong>: se saca una 3ra carta. <strong>Si queda exactamente entre las dos primeras, ganás</strong> y la banca te paga; si no, perdés lo apostado.{" "}
                <strong>Pasás</strong>: no arriesgás nada en esa ronda.
              </li>
              <li>Si tus dos primeras cartas son consecutivas, no hay carta posible: mejor pasá.</li>
              <li>
                Gana <strong className="text-[#F5DEB3]">el último jugador con plata</strong> en la mesa.
              </li>
            </ul>
            <p>
              Al ganar el partido te llevás tu ficho restante{" "}
              <strong className="text-green-400">+ {WIN_PRIZE} INT de premio</strong> y conquistás ese lugar. Si perdés,
              te quedás sin esa ficha y podés volver a intentarlo.
            </p>
          </Section>

          <Section icon={<Map className="w-4 h-4" />} title="Conquistar un pueblo">
            <p>Un pueblo está conquistado cuando:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ganaste en <strong>todos</strong> sus lugares de juego.</li>
              <li>Compraste <strong>todas</strong> sus propiedades (las 3 casas).</li>
            </ul>
            <p>
              Al conquistarlo se desbloquea el siguiente pueblo automáticamente. También podés pagar{" "}
              <strong className="text-[#F5DEB3]">{SKIP_UNLOCK_PRICE} INT</strong> para saltear el desbloqueo, pero eso{" "}
              <em>no</em> cuenta como conquista: el premio final exige conquistar los {TOWN_DEFS.length} pueblos de
              verdad.
            </p>
          </Section>

          <Section icon={<Home className="w-4 h-4" />} title="Propiedades e ingresos">
            <p>
              Cada propiedad te rinde su monto todos los días. Los INT se acumulan cada{" "}
              <strong className="text-[#F5DEB3]">24 horas</strong> pero no se acreditan solos: apretá el botón verde{" "}
              <strong className="text-green-400">Cobrar</strong> en el mapa para juntarlos (si dejás pasar días, se
              acumulan todos).
            </p>
          </Section>

          <Section icon={<Coins className="w-4 h-4" />} title="INT de la Campaña">
            <p>
              La Campaña usa su <strong className="text-[#F5DEB3]">billetera propia</strong>: los INT de acá no son los
              de la Caja de Multijugador (ni se pueden retirar). Ganás INT jugando, cobrando alquileres o{" "}
              <strong>comprando paquetes con Mercado Pago</strong> desde la tienda cuando te quedás sin plata.
            </p>
          </Section>

          <Section icon={<Trophy className="w-4 h-4" />} title="Resumen rápido">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Ganá partidos para conquistar lugares.</li>
              <li>Comprá las propiedades del pueblo.</li>
              <li>Conquistá los {TOWN_DEFS.length} pueblos.</li>
              <li>
                Cobrá los <strong className="text-green-400">{CAMPAIGN_COMPLETION_REWARD} INT</strong> en tu Caja de
                Multijugador. 🎉
              </li>
            </ol>
          </Section>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full bg-gradient-to-b from-[#D4AF37] to-[#B8941E] border-2 border-[#654321] rounded-lg px-4 py-2.5 text-[#3E2723] font-bold hover:from-[#FFD700] hover:to-[#D4AF37] transition-all active:scale-[0.98]"
        >
          ¡Entendido!
        </button>
      </div>
    </div>
  );
}

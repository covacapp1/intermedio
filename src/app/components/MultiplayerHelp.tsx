import { X, Users, Wifi } from "lucide-react";

interface MultiplayerHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MultiplayerHelp({ isOpen, onClose }: MultiplayerHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-[#8B4513] to-[#654321] border-4 border-[#D4AF37] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#654321] border-b-4 border-[#D4AF37] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="w-6 h-6 text-green-400" />
            <h2 className="text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: 'serif' }}>
              Multijugador en Tiempo Real
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#F5DEB3] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-[#F5DEB3]">
          {/* How it works */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-xl font-bold" style={{ fontFamily: 'serif' }}>
                ¿Cómo funciona?
              </h3>
            </div>
            <p className="text-[#D2B48C] leading-relaxed">
              Ahora puedes jugar Intermedio con otras personas reales en tiempo real. El juego está sincronizado
              mediante un servidor que mantiene el estado actualizado para todos los jugadores.
            </p>
          </section>

          {/* How to test */}
          <section className="bg-black/20 rounded-lg p-4 border-2 border-[#D4AF37]/30">
            <h3 className="text-lg font-bold mb-3 text-[#D4AF37]" style={{ fontFamily: 'serif' }}>
              🧪 Cómo Probar el Multijugador
            </h3>
            <ol className="space-y-3 text-[#D2B48C]">
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">1.</span>
                <span>Abre <strong>dos ventanas</strong> del navegador (puedes usar modo incógnito o dos navegadores diferentes)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">2.</span>
                <span>En la <strong>primera ventana</strong>, inicia sesión con un email (ej: <code className="bg-black/30 px-1 rounded">jugador1@test.com</code>)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">3.</span>
                <span>En la <strong>segunda ventana</strong>, inicia sesión con otro email (ej: <code className="bg-black/30 px-1 rounded">jugador2@test.com</code>)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">4.</span>
                <span>En la primera ventana, ve a "Jugar" y crea una nueva mesa</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">5.</span>
                <span>En la segunda ventana, ve a "Jugar" y verás la mesa creada (puede tardar hasta 3 segundos)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">6.</span>
                <span>Únete a la mesa desde la segunda ventana</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">7.</span>
                <span>Cuando haya 3 jugadores (necesitas una tercera ventana), ¡el juego comenzará automáticamente!</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4AF37] flex-shrink-0">8.</span>
                <span>Haz apuestas en ambas ventanas y verás cómo se sincronizan en tiempo real</span>
              </li>
            </ol>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'serif' }}>
              ⚡ Características
            </h3>
            <ul className="space-y-2 text-[#D2B48C]">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Sincronización automática</strong> cada 2 segundos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Detección de conexión</strong> - puntos verdes/rojos en los avatares</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Lógica centralizada</strong> - imposible hacer trampa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Auto-inicio</strong> cuando la mesa se llena</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Multi-dispositivo</strong> - juega desde celular, tablet o PC</span>
              </li>
            </ul>
          </section>

          {/* Tips */}
          <section className="bg-[#D4AF37]/10 rounded-lg p-4 border-2 border-[#D4AF37]/30">
            <h3 className="text-lg font-bold mb-3 text-[#D4AF37]" style={{ fontFamily: 'serif' }}>
              💡 Consejos
            </h3>
            <ul className="space-y-2 text-[#D2B48C] text-sm">
              <li>• Las mesas se actualizan cada 3 segundos - si no ves una mesa, espera un momento</li>
              <li>• El indicador verde "En vivo" muestra que estás conectado al servidor</li>
              <li>• Puedes ver el estado de conexión de otros jugadores en su avatar</li>
              <li>• Si abandonas una mesa, se eliminará si no quedan jugadores</li>
              <li>• Abre la consola del navegador (F12) para ver las comunicaciones con el servidor</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#654321] border-t-4 border-[#D4AF37] p-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-b from-[#228B22] to-[#006400] text-white font-bold text-lg border-2 border-[#D4AF37] rounded-lg shadow-lg hover:from-[#32CD32] hover:to-[#228B22] transition-all"
            style={{ fontFamily: 'serif' }}
          >
            ¡Entendido, vamos a jugar!
          </button>
        </div>
      </div>
    </div>
  );
}

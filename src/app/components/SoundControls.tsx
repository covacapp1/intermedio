import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { bgm } from "../utils/sounds";

export function SoundControls() {
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [started, setStarted] = useState(false);

  // Auto-start music on first user interaction
  const handleFirstInteraction = useCallback(() => {
    if (!started) {
      setStarted(true);
      setMusicOn(true);
      bgm.start();
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    }
  }, [started]);

  useEffect(() => {
    document.addEventListener("touchstart", handleFirstInteraction, { once: true });
    document.addEventListener("click", handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, [handleFirstInteraction]);

  useEffect(() => {
    if (musicOn) {
      bgm.start();
    } else {
      bgm.stop();
    }
  }, [musicOn]);

  const toggleMute = () => {
    setMuted(!muted);
    if (!muted) {
      document.documentElement.style.setProperty("--sound-muted", "1");
    } else {
      document.documentElement.style.setProperty("--sound-muted", "0");
    }
  };

  const toggleMusic = () => {
    setMusicOn(!musicOn);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <button
        onClick={toggleMute}
        className="w-12 h-12 rounded-full bg-[#654321] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg hover:bg-[#7d5a2e] active:scale-95 transition-all"
        title={muted ? "Activar sonidos" : "Silenciar sonidos"}
      >
        {muted ? (
          <VolumeX className="w-6 h-6 text-[#D4AF37]" />
        ) : (
          <Volume2 className="w-6 h-6 text-[#D4AF37]" />
        )}
      </button>
      <button
        onClick={toggleMusic}
        className="w-12 h-12 rounded-full bg-[#654321] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg hover:bg-[#7d5a2e] active:scale-95 transition-all"
        title={musicOn ? "Apagar música" : "Encender música"}
      >
        {musicOn ? (
          <span className="text-xl">🎵</span>
        ) : (
          <span className="text-xl opacity-40">🔇</span>
        )}
      </button>
    </div>
  );
}

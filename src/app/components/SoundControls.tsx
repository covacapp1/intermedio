import { useState, useEffect } from "react";
import { Volume2, VolumeX, Music, Pause } from "lucide-react";
import { bgm } from "../utils/sounds";

export function SoundControls() {
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    if (musicOn) {
      bgm.start();
    } else {
      bgm.stop();
    }
  }, [musicOn]);

  const toggleMute = () => {
    setMuted(!muted);
    // Apply mute to all future sounds
    if (!muted) {
      document.documentElement.style.setProperty("--sound-muted", "1");
    } else {
      document.documentElement.style.setProperty("--sound-muted", "0");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <button
        onClick={toggleMute}
        className="w-10 h-10 rounded-full bg-[#654321] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg hover:bg-[#7d5a2e] transition-colors"
        title={muted ? "Activar sonidos" : "Silenciar sonidos"}
      >
        {muted ? (
          <VolumeX className="w-5 h-5 text-[#D4AF37]" />
        ) : (
          <Volume2 className="w-5 h-5 text-[#D4AF37]" />
        )}
      </button>
      <button
        onClick={() => setMusicOn(!musicOn)}
        className="w-10 h-10 rounded-full bg-[#654321] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg hover:bg-[#7d5a2e] transition-colors"
        title={musicOn ? "Apagar música" : "Encender música"}
      >
        {musicOn ? (
          <Music className="w-5 h-5 text-[#D4AF37]" />
        ) : (
          <Pause className="w-5 h-5 text-[#D4AF37]/50" />
        )}
      </button>
    </div>
  );
}

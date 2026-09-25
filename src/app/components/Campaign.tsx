import { ArrowLeft } from "lucide-react";

interface CampaignProps {
  onBack: () => void;
}

export function Campaign({ onBack }: CampaignProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-2xl mx-auto pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#F5DEB3] font-semibold mb-6 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        <div className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <h1
              className="text-3xl sm:text-4xl font-bold text-[#F5DEB3]"
              style={{ fontFamily: "serif" }}
            >
              Campaña
            </h1>
            <div className="h-1 w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>

          <div className="text-center py-12 text-[#D2B48C]">
            <p className="text-lg">Proximamente...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

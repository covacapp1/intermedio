import { useState } from "react";
import { Camera } from "lucide-react";

interface ProfileData {
  username: string;
  fullName: string;
  dni: string;
  email: string;
  photoUrl: string;
}

interface ProfileProps {
  profileData: ProfileData;
  onBack: () => void;
  onSave: (data: ProfileData) => void;
}

export function Profile({ profileData, onBack, onSave }: ProfileProps) {
  const [formData, setFormData] = useState(profileData);
  const [isEditing, setIsEditing] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
        >
          ← Volver
        </button>

        <div className="text-center mb-8">
          <h1 
            className="text-5xl font-bold text-[#F5DEB3] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mb-4"
            style={{ 
              fontFamily: 'serif',
              textShadow: '3px 3px 0 #654321',
            }}
          >
            🤠 MI PERFIL
          </h1>
        </div>

        {/* Profile Card */}
        <div 
          className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
          style={{
            background: 'linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)',
          }}
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>

          {/* Photo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div 
                className="w-40 h-40 rounded-full border-4 border-[#D4AF37] shadow-[0_8px_20px_rgba(0,0,0,0.5)] overflow-hidden bg-[#654321] flex items-center justify-center"
                style={{
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5), inset 0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                {formData.photoUrl ? (
                  <img 
                    src={formData.photoUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl text-[#D2B48C]">🤠</div>
                )}
              </div>
              
              {/* Photo upload button */}
              <label 
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] rounded-full border-3 border-[#654321] shadow-lg flex items-center justify-center cursor-pointer hover:from-[#FFD700] hover:to-[#D4AF37] transition-all group-hover:scale-110"
              >
                <Camera className="w-6 h-6 text-[#3E2723]" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[#D2B48C] text-sm mt-4">Haz click en la cámara para cambiar tu foto</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm">
                👤 Usuario
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Tu nombre de usuario"
              />
            </div>

            <div>
              <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm">
                📝 Nombre Completo
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm">
                🎫 DNI
              </label>
              <input
                type="text"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Tu número de documento"
              />
            </div>

            <div>
              <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm">
                📧 Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-xl border-4 border-[#654321] rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:from-[#FFD700] hover:to-[#D4AF37] transition-all transform hover:scale-105 active:scale-95 relative"
                style={{ fontFamily: 'serif' }}
              >
                <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#3E2723]"></div>
                <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#3E2723]"></div>
                <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#3E2723]"></div>
                <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#3E2723]"></div>
                ✏️ EDITAR PERFIL
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setFormData(profileData);
                    setIsEditing(false);
                  }}
                  className="py-4 bg-gradient-to-b from-[#8B7355] to-[#5D4E37] text-white font-bold text-lg border-4 border-[#654321] rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:from-[#A0826D] hover:to-[#8B7355] transition-all transform hover:scale-105 active:scale-95"
                  style={{ fontFamily: 'serif' }}
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleSave}
                  className="py-4 bg-gradient-to-b from-[#228B22] to-[#006400] text-white font-bold text-lg border-4 border-[#654321] rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:from-[#32CD32] hover:to-[#228B22] transition-all transform hover:scale-105 active:scale-95"
                  style={{ fontFamily: 'serif' }}
                >
                  💾 GUARDAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

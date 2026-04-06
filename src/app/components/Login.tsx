import { useState } from "react";

interface LoginProps {
  onLogin: (email: string, password: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#F5DEB3] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mb-2" style={{ fontFamily: 'serif', textShadow: '3px 3px 0 #654321, -1px -1px 0 #654321, 1px -1px 0 #654321, -1px 1px 0 #654321' }}>
            INTERMEDIO
          </h1>
          <p className="text-[#D2B48C] text-base sm:text-lg">Saloon & Card Game</p>
        </div>

        {/* Login Form */}
        <form 
          onSubmit={handleSubmit}
          className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
          style={{
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
          }}
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-base sm:text-lg border-2 border-[#654321] rounded shadow-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all transform hover:scale-105 active:scale-95"
              style={{ fontFamily: 'serif' }}
            >
              ENTRAR AL SALOON
            </button>
          </div>
        </form>

        <p className="text-center text-[#D2B48C] mt-4 text-xs sm:text-sm">
          ¿Nuevo en el pueblo? Ingresa cualquier correo para empezar
        </p>
      </div>
    </div>
  );
}
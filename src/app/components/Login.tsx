import { useMemo, useState } from "react";

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  dni: string;
  username: string;
  email: string;
  password: string;
}

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (data: RegisterFormData) => void;
  isLoading?: boolean;
  errorMessage?: string;
}

export function Login({ onLogin, onRegister, isLoading = false, errorMessage = "" }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    dni: "",
    username: "",
    email: "",
    password: "",
  });

  const title = useMemo(
    () => (mode === "login" ? "Ingresa a tu cuenta" : "Crea tu cuenta"),
    [mode]
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword && !isLoading) {
      onLogin(loginEmail, loginPassword);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      registerForm.firstName &&
      registerForm.lastName &&
      registerForm.dni &&
      registerForm.username &&
      registerForm.email &&
      registerForm.password &&
      !isLoading
    ) {
      onRegister(registerForm);
    }
  };

  const updateRegisterField = (field: keyof RegisterFormData, value: string) => {
    setRegisterForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#F5DEB3] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mb-2"
            style={{
              fontFamily: "serif",
              textShadow: "3px 3px 0 #654321, -1px -1px 0 #654321, 1px -1px 0 #654321, -1px 1px 0 #654321",
            }}
          >
            INTERMEDIO
          </h1>
          <p className="text-[#D2B48C] text-base sm:text-lg">Card Game</p>
        </div>

        <div
          className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative"
          style={{
            background: "linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)",
          }}
        >
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>

          <div className="mb-5 flex rounded-md border-2 border-[#654321] overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("login")}
              disabled={isLoading}
              className={`flex-1 py-3 font-bold ${
                mode === "login" ? "bg-[#D4AF37] text-[#3E2723]" : "bg-[#5e3418] text-[#F5DEB3]"
              }`}
              style={{ fontFamily: "serif" }}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              disabled={isLoading}
              className={`flex-1 py-3 font-bold ${
                mode === "register" ? "bg-[#D4AF37] text-[#3E2723]" : "bg-[#5e3418] text-[#F5DEB3]"
              }`}
              style={{ fontFamily: "serif" }}
            >
              Registrarse
            </button>
          </div>

          <h2 className="mb-4 text-center text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            {title}
          </h2>

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base"
                >
                  Contrasena
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                  placeholder="********"
                  required
                />
              </div>

              {errorMessage ? (
                <div className="rounded border border-[#7f1d1d] bg-[#2b1111] px-3 py-2 text-sm text-[#fecaca]">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-base sm:text-lg border-2 border-[#654321] rounded shadow-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ fontFamily: "serif" }}
              >
                {isLoading ? "PROCESANDO..." : "INGRESAR"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">Nombre</label>
                  <input
                    type="text"
                    value={registerForm.firstName}
                    onChange={(e) => updateRegisterField("firstName", e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                    placeholder="Juan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">Apellido</label>
                  <input
                    type="text"
                    value={registerForm.lastName}
                    onChange={(e) => updateRegisterField("lastName", e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                    placeholder="Perez"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">DNI</label>
                  <input
                    type="text"
                    value={registerForm.dni}
                    onChange={(e) => updateRegisterField("dni", e.target.value.replace(/[^\d]/g, ""))}
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                    placeholder="12345678"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">Usuario</label>
                  <input
                    type="text"
                    value={registerForm.username}
                    onChange={(e) => updateRegisterField("username", e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                    placeholder="juanperez"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => updateRegisterField("email", e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[#F5DEB3] mb-2 font-semibold text-sm sm:text-base">Contrasena</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => updateRegisterField("password", e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-70"
                  placeholder="Minimo 6 caracteres"
                  required
                />
              </div>

              {errorMessage ? (
                <div className="rounded border border-[#7f1d1d] bg-[#2b1111] px-3 py-2 text-sm text-[#fecaca]">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-base sm:text-lg border-2 border-[#654321] rounded shadow-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ fontFamily: "serif" }}
              >
                {isLoading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
              </button>
            </form>
          )}

          <p className="text-center text-[#D2B48C] mt-5 text-xs sm:text-sm">
            {mode === "login"
              ? "Ingresa con el email y la contrasena de tu cuenta."
              : "Completa tus datos reales para crear una cuenta mas completa."}
          </p>
        </div>
      </div>
    </div>
  );
}

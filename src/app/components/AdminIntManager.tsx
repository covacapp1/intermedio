import { useState, useCallback } from "react";
import { formatInt } from "../utils/economy";

interface UserIntInfo {
  userId: string;
  email: string;
  balance: number;
}

interface AdminIntManagerProps {
  users: UserIntInfo[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onUpdateBalance: (userId: string, newBalance: number) => Promise<void>;
}

export function AdminIntManager({
  users,
  onBack,
  onRefresh,
  onUpdateBalance,
}: AdminIntManagerProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleEdit = useCallback((user: UserIntInfo) => {
    setEditingUserId(user.userId);
    setEditValue(user.balance.toString());
  }, []);

  const handleCancel = useCallback(() => {
    setEditingUserId(null);
    setEditValue("");
  }, []);

  const handleSave = useCallback(
    async (userId: string) => {
      const newBalance = parseInt(editValue, 10);
      if (isNaN(newBalance) || newBalance < 0) {
        alert("Por favor ingresa un valor numérico válido");
        return;
      }

      setUpdatingUserId(userId);
      try {
        await onUpdateBalance(userId, newBalance);
        setEditingUserId(null);
        setEditValue("");
      } finally {
        setUpdatingUserId(null);
      }
    },
    [editValue, onUpdateBalance]
  );

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-6xl mx-auto pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#D4AF37] text-[#3E2723] font-semibold rounded border-2 border-[#654321] hover:bg-[#FFD700] transition-colors"
          >
            Actualizar lista
          </button>
        </div>

        <section
          className="mt-6 bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
          style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
        >
          <h1 className="text-4xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            Gestionar INT de Usuarios
          </h1>
          <p className="mt-2 text-sm text-[#D2B48C]">
            Modifica el balance de INT de cualquier usuario ingresando un valor directamente.
          </p>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Buscar por email o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-96 px-4 py-2 bg-black/30 border-2 border-[#D4AF37]/40 rounded text-[#F5DEB3] placeholder-[#D2B48C]/50 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#D4AF37]/40">
                  <th className="py-3 px-4 text-[#D4AF37] font-semibold">Email</th>
                  <th className="py-3 px-4 text-[#D4AF37] font-semibold">User ID</th>
                  <th className="py-3 px-4 text-[#D4AF37] font-semibold text-right">Balance INT</th>
                  <th className="py-3 px-4 text-[#D4AF37] font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#D2B48C]">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.userId}
                      className="border-b border-[#D4AF37]/20 hover:bg-black/10"
                    >
                      <td className="py-3 px-4 text-[#F5DEB3]">{user.email}</td>
                      <td className="py-3 px-4 text-[#D2B48C] text-sm font-mono">
                        {user.userId.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingUserId === user.userId ? (
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(user.userId);
                              if (e.key === "Escape") handleCancel();
                            }}
                            className="w-32 px-2 py-1 bg-black/30 border-2 border-[#D4AF37] rounded text-[#F5DEB3] text-right focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-[#F5DEB3] font-semibold">
                            {formatInt(user.balance)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {editingUserId === user.userId ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSave(user.userId)}
                              disabled={updatingUserId === user.userId}
                              className="px-3 py-1 bg-gradient-to-b from-[#228B22] to-[#006400] text-white rounded border border-[#654321] hover:from-[#32CD32] hover:to-[#228B22] disabled:opacity-50 text-sm"
                            >
                              {updatingUserId === user.userId ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={updatingUserId === user.userId}
                              className="px-3 py-1 bg-gradient-to-b from-[#DC143C] to-[#8B0000] text-white rounded border border-[#654321] hover:from-[#FF4D6D] hover:to-[#DC143C] disabled:opacity-50 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-4 py-1 bg-[#D4AF37] text-[#3E2723] font-semibold rounded border border-[#654321] hover:bg-[#FFD700] transition-colors text-sm"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

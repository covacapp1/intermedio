import { useState } from "react";
import type { AdminWithdrawalItem } from "../types/wallet";
import { formatArs, formatInt } from "../utils/economy";

interface AdminWithdrawalsProps {
  withdrawals: AdminWithdrawalItem[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onResolve: (withdrawalId: string, status: "approved" | "rejected", rejectionReason?: string) => Promise<void>;
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);

export function AdminWithdrawals({
  withdrawals,
  onBack,
  onRefresh,
  onResolve,
}: AdminWithdrawalsProps) {
  const [busyId, setBusyId] = useState("");

  const resolve = async (withdrawalId: string, status: "approved" | "rejected") => {
    const rejectionReason =
      status === "rejected"
        ? window.prompt("Motivo del rechazo (opcional):") || undefined
        : undefined;

    setBusyId(withdrawalId);
    try {
      await onResolve(withdrawalId, status, rejectionReason);
    } finally {
      setBusyId("");
    }
  };

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
            Actualizar retiros
          </button>
        </div>

        <section
          className="mt-6 bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
          style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
        >
          <h1 className="text-4xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            Panel de retiros
          </h1>
          <p className="mt-2 text-sm text-[#D2B48C]">
            Aprobar confirma la salida manual en ARS. Rechazar devuelve el saldo reservado en INT al usuario.
          </p>

          <div className="mt-6 grid gap-4">
            {withdrawals.length === 0 ? (
              <div className="rounded-lg border border-[#D4AF37]/40 bg-black/20 p-4 text-[#F5DEB3]">
                No hay retiros cargados.
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <article
                  key={withdrawal.id}
                  className="rounded-xl border border-[#D4AF37]/40 bg-black/20 p-4 text-[#F5DEB3]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1 text-sm">
                      <p className="text-lg font-bold">{formatInt(withdrawal.amount)}</p>
                      <p>Equivale a pagar {formatArs(withdrawal.amount)}</p>
                      <p>{withdrawal.fullName} | {withdrawal.email}</p>
                      <p>DNI: {withdrawal.dni}</p>
                      <p>Usuario: {withdrawal.userId}</p>
                      <p>Metodo: {withdrawal.method === "bank_transfer" ? "Transferencia" : "Mercado Pago"}</p>
                      <p>Destino: {withdrawal.accountDestination}</p>
                      <p>Titular: {withdrawal.accountHolder}</p>
                      <p>Saldo wallet actual: {formatInt(withdrawal.walletBalance)}</p>
                      <p>Solicitado: {formatDate(withdrawal.requestedAt)}</p>
                      <p className="uppercase tracking-[0.2em] text-[#D4AF37]">{withdrawal.status}</p>
                      {withdrawal.rejectionReason ? <p>Motivo rechazo: {withdrawal.rejectionReason}</p> : null}
                    </div>

                    {withdrawal.status === "pending" ? (
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <button
                          onClick={() => resolve(withdrawal.id, "approved")}
                          disabled={busyId === withdrawal.id}
                          className="rounded border-2 border-[#654321] bg-gradient-to-b from-[#228B22] to-[#006400] px-4 py-3 font-bold text-white hover:from-[#32CD32] hover:to-[#228B22] disabled:opacity-70"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => resolve(withdrawal.id, "rejected")}
                          disabled={busyId === withdrawal.id}
                          className="rounded border-2 border-[#654321] bg-gradient-to-b from-[#DC143C] to-[#8B0000] px-4 py-3 font-bold text-white hover:from-[#FF4D6D] hover:to-[#DC143C] disabled:opacity-70"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-[#D2B48C]">
                        Revisado: {withdrawal.reviewedAt ? formatDate(withdrawal.reviewedAt) : "-"}
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

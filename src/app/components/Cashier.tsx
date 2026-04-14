import { useMemo, useState } from "react";
import {
  type WalletSummary,
  type WalletTransaction,
  type WithdrawalMethod,
} from "../types/wallet";
import { IntIcon } from "./IntIcon";
import { formatArs, formatInt, INT_CURRENCY, INT_TO_ARS_RATE } from "../utils/economy";

interface CashierProps {
  userBalance: number;
  walletSummary: WalletSummary;
  profileData: {
    username: string;
    fullName: string;
    dni: string;
    email: string;
    photoUrl: string;
  };
  notice: string;
  onBack: () => void;
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (payload: {
    amount: number;
    method: WithdrawalMethod;
    accountHolder: string;
    accountDestination: string;
    notes?: string;
  }) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);

const transactionLabel = (transaction: WalletTransaction) => {
  if (transaction.kind === "deposit") return "Carga";
  if (transaction.kind === "withdrawal") return "Retiro";
  if (transaction.kind === "rebuy") return "Rebuy";
  if (transaction.kind === "game_buy_in") return "Buy-in";
  return "Movimiento";
};

export function Cashier({
  userBalance,
  walletSummary,
  profileData,
  notice,
  onBack,
  onDeposit,
  onWithdraw,
  onRefresh,
}: CashierProps) {
  const [depositAmount, setDepositAmount] = useState("5000");
  const [withdrawAmount, setWithdrawAmount] = useState("2500");
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>("bank_transfer");
  const [accountHolder, setAccountHolder] = useState(profileData.fullName);
  const [accountDestination, setAccountDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const recentTransactions = useMemo(
    () => walletSummary.transactions.slice(0, 6),
    [walletSummary.transactions]
  );

  const recentWithdrawals = useMemo(
    () => walletSummary.withdrawals.slice(0, 4),
    [walletSummary.withdrawals]
  );

  const submitDeposit = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setIsDepositing(true);
    try {
      await onDeposit(amount);
    } finally {
      setIsDepositing(false);
    }
  };

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setIsWithdrawing(true);
    try {
      await onWithdraw({
        amount,
        method: withdrawMethod,
        accountHolder,
        accountDestination,
        notes,
      });
      setNotes("");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const refreshSummary = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-5xl mx-auto pt-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
        >
          Volver
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section
            className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[#D2B48C] text-sm uppercase tracking-[0.2em]">Caja principal</p>
                <h1
                  className="text-4xl sm:text-5xl font-bold text-[#F5DEB3]"
                  style={{ fontFamily: "serif", textShadow: "3px 3px 0 #654321" }}
                >
                  Cajero
                </h1>
              </div>
              <button
                onClick={refreshSummary}
                className="px-4 py-2 bg-[#D4AF37] text-[#3E2723] font-semibold rounded border-2 border-[#654321] hover:bg-[#FFD700] transition-colors"
              >
                {isRefreshing ? "Actualizando..." : "Actualizar saldo"}
              </button>
            </div>

            <div className="mt-6 rounded-xl border-2 border-[#D4AF37] bg-black/20 p-5">
              <p className="text-[#D2B48C] text-sm">Saldo disponible</p>
              <div className="mt-1 flex items-center gap-3">
                <IntIcon className="h-10 w-10 text-xl text-[#3E2723]" />
                <p className="text-5xl font-bold text-[#D4AF37]" style={{ fontFamily: "serif" }}>
                  {formatInt(userBalance)}
                </p>
              </div>
              <p className="mt-2 text-sm text-[#F5DEB3]/85">
                1 ARS = {INT_TO_ARS_RATE} {INT_CURRENCY}. Las cargas acreditan INT al confirmar webhook y los retiros descuentan INT para pagar el mismo monto en pesos.
              </p>
            </div>

            {notice ? (
              <div className="mt-4 rounded-lg border border-[#D4AF37] bg-[#F5DEB3]/10 px-4 py-3 text-sm text-[#F5DEB3]">
                {notice}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border-2 border-[#654321] bg-[#3E2723]/35 p-4">
                <p className="text-xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                  Comprar INT
                </p>
                <p className="mt-1 text-sm text-[#D2B48C]">
                  Depositas pesos por Mercado Pago y recibes la misma cantidad en INT.
                </p>
                <label className="mt-4 block text-sm font-semibold text-[#F5DEB3]">Monto en ARS</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={depositAmount}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className="mt-2 w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={submitDeposit}
                  disabled={isDepositing}
                  className="mt-4 w-full rounded border-2 border-[#654321] bg-gradient-to-b from-[#228B22] to-[#006400] px-4 py-3 font-bold text-white transition-all hover:from-[#32CD32] hover:to-[#228B22] disabled:opacity-70"
                  style={{ fontFamily: "serif" }}
                >
                  {isDepositing ? "Abriendo checkout..." : "Comprar INT"}
                </button>
                <p className="mt-3 text-xs text-[#D2B48C]">
                  Recibiras {formatInt(Number(depositAmount) || 0)} por {formatArs(Number(depositAmount) || 0)}.
                </p>
              </div>

              <div className="rounded-xl border-2 border-[#654321] bg-[#3E2723]/35 p-4">
                <p className="text-xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                  Retirar INT
                </p>
                <p className="mt-1 text-sm text-[#D2B48C]">
                  Monto minimo sugerido: 1.000 INT. Se descuentan INT y se paga el mismo monto en ARS tras aprobacion manual.
                </p>

                <div className="mt-4 grid gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={withdrawAmount}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                    placeholder="Monto en INT"
                  />
                  <select
                    value={withdrawMethod}
                    onChange={(event) => setWithdrawMethod(event.target.value as WithdrawalMethod)}
                    className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="bank_transfer">CVU / CBU / Alias</option>
                    <option value="mercado_pago">Cuenta Mercado Pago</option>
                  </select>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(event) => setAccountHolder(event.target.value)}
                    className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                    placeholder="Titular"
                  />
                  <input
                    type="text"
                    value={accountDestination}
                    onChange={(event) => setAccountDestination(event.target.value)}
                    className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                    placeholder="CVU, CBU, Alias o email de MP"
                  />
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded border-2 border-[#654321] bg-[#D2B48C] px-4 py-3 text-[#3E2723] focus:outline-none focus:border-[#D4AF37]"
                    placeholder="Observaciones opcionales"
                  />
                </div>

                <div className="mt-3 text-xs text-[#D2B48C]">
                  Se toman del perfil: nombre, DNI y email. Si falta alguno, completalo en Perfil antes de retirar.
                </div>
                <div className="mt-2 text-xs text-[#D2B48C]">
                  Retiras {formatInt(Number(withdrawAmount) || 0)} y recibes {formatArs(Number(withdrawAmount) || 0)}.
                </div>

                <button
                  onClick={submitWithdrawal}
                  disabled={
                    isWithdrawing ||
                    !profileData.fullName ||
                    !profileData.dni ||
                    !profileData.email ||
                    !accountHolder ||
                    !accountDestination
                  }
                  className="mt-4 w-full rounded border-2 border-[#654321] bg-gradient-to-b from-[#DC143C] to-[#8B0000] px-4 py-3 font-bold text-white transition-all hover:from-[#FF4D6D] hover:to-[#DC143C] disabled:opacity-70"
                  style={{ fontFamily: "serif" }}
                >
                    {isWithdrawing ? "Registrando retiro..." : "Retirar PESOS"}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section
              className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-5 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
              style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
            >
              <p className="text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                Perfil para retiros
              </p>
              <div className="mt-4 space-y-2 text-sm text-[#F5DEB3]">
                <p>Usuario: {profileData.username || "-"}</p>
                <p>Nombre: {profileData.fullName || "-"}</p>
                <p>DNI: {profileData.dni || "-"}</p>
                <p>Email: {profileData.email || "-"}</p>
              </div>
            </section>

            <section
              className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-5 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
              style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
            >
              <p className="text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                Ultimos movimientos
              </p>
              <div className="mt-4 space-y-3">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-[#D2B48C]">Todavia no hay movimientos registrados.</p>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-lg border border-[#D4AF37]/40 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#F5DEB3]">{transactionLabel(transaction)}</p>
                        <p
                          className={
                            transaction.direction === "credit" ? "text-[#7CFC00]" : "text-[#FF8A80]"
                          }
                        >
                          {transaction.direction === "credit" ? "+" : "-"}
                          {formatInt(transaction.amount)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-[#D2B48C]">{transaction.description}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#F5DEB3]/70">
                        <span>{transaction.status}</span>
                        <span>{formatDate(transaction.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section
              className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-5 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
              style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
            >
              <p className="text-2xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
                Retiros recientes
              </p>
              <div className="mt-4 space-y-3">
                {recentWithdrawals.length === 0 ? (
                  <p className="text-sm text-[#D2B48C]">No hay retiros cargados todavia.</p>
                ) : (
                  recentWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="rounded-lg border border-[#D4AF37]/40 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#F5DEB3]">{formatInt(withdrawal.amount)}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">{withdrawal.status}</p>
                      </div>
                      <p className="mt-1 text-sm text-[#D2B48C]">
                        {withdrawal.method === "bank_transfer" ? "Transferencia" : "Mercado Pago"} a{" "}
                        {withdrawal.accountDestination}
                      </p>
                      <p className="mt-1 text-xs text-[#F5DEB3]/70">{formatDate(withdrawal.requestedAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

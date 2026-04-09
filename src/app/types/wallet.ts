export const STARTING_BALANCE = 0;

export type WalletTransactionKind =
  | "deposit"
  | "withdrawal"
  | "game_buy_in"
  | "rebuy"
  | "adjustment";

export type WalletTransactionStatus = "pending" | "approved" | "rejected";
export type WalletDirection = "credit" | "debit";
export type WithdrawalMethod = "bank_transfer" | "mercado_pago";
export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface WalletTransaction {
  id: string;
  kind: WalletTransactionKind;
  direction: WalletDirection;
  amount: number;
  status: WalletTransactionStatus;
  description: string;
  createdAt: number;
  metadata?: Record<string, string>;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  requestedAt: number;
  reviewedAt?: number;
  rejectionReason?: string;
  fullName: string;
  dni: string;
  email: string;
  accountHolder: string;
  accountDestination: string;
  notes?: string;
}

export interface AdminWithdrawalItem extends WithdrawalRequest {
  userId: string;
  walletEmail: string;
  walletBalance: number;
}

export interface WalletSummary {
  userId: string;
  email: string;
  balance: number;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
  updatedAt: number;
}

export interface CreateDepositCheckoutPayload {
  userId: string;
  email: string;
  fullName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  pendingUrl: string;
}

export interface CreateDepositCheckoutResponse {
  checkoutUrl: string;
  preferenceId: string;
  transactionId: string;
}

export interface CreateWithdrawalPayload {
  userId: string;
  email: string;
  fullName: string;
  dni: string;
  amount: number;
  method: WithdrawalMethod;
  accountHolder: string;
  accountDestination: string;
  notes?: string;
}

export interface RecordWalletMovementPayload {
  userId: string;
  email: string;
  amount: number;
  direction: WalletDirection;
  kind: WalletTransactionKind;
  description: string;
}

export interface UpdateWithdrawalStatusPayload {
  withdrawalId: string;
  status: Exclude<WithdrawalStatus, "pending">;
  rejectionReason?: string;
}

export const createEmptyWalletSummary = (userId: string, email: string): WalletSummary => ({
  userId,
  email,
  balance: STARTING_BALANCE,
  transactions: [],
  withdrawals: [],
  updatedAt: Date.now(),
});

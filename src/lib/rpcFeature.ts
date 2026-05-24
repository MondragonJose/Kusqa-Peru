/**
 * Feature flag: atomic mission writes via Supabase RPC.
 * Set VITE_USE_RPC_TRANSACTIONS=true after deploying migration RPCs.
 */
export function useRpcTransactions(): boolean {
  return import.meta.env.VITE_USE_RPC_TRANSACTIONS === "true";
}

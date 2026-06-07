/**
 * createSupabaseMock — Phase 5A test helper.
 *
 * A chainable supabase-js mock for repository tests. The `from`,
 * `rpc`, and `channel` surfaces are stubbed; everything else
 * returns a function that yields a new chain. Terminal calls
 * (`await chain`, `.single()`, `.maybeSingle()`) resolve with the
 * response that was set via `queue.tableResponse()` /
 * `queue.rpcResponse()`.
 *
 * Designed to be paired with `vi.hoisted` so the same mock instance
 * is visible inside the `vi.mock("@/lib/supabase", ...)` factory
 * and inside the test bodies:
 *
 *   const mock = vi.hoisted(() => createSupabaseMock());
 *   vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));
 *
 *   it("...", async () => {
 *     mock.queue.tableResponse("districts", { data: [...], error: null });
 *     const result = await repo.find(...);
 *   });
 */

export type SupabaseResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } };

type ResponseInput = SupabaseResponse<unknown> | (() => SupabaseResponse<unknown>);

function resolve(r: ResponseInput | undefined): SupabaseResponse<unknown> {
  if (r === undefined) {
    return { data: null, error: { message: "no mock response configured" } };
  }
  if (typeof r === "function") return (r as () => SupabaseResponse<unknown>)();
  return r;
}

type Queue = {
  /** Set a response for a given table (matched by `.from(table)`). */
  tableResponse: (table: string, response: ResponseInput) => void;
  /** Set a response for a given RPC name (matched by `.rpc(name, ...)`). */
  rpcResponse: (name: string, response: ResponseInput) => void;
  /** Inspect all RPC calls the mock has captured. */
  rpcCalls: Array<{ name: string; params: unknown }>;
  /** Inspect all `.from(table)` calls the mock has captured. */
  fromCalls: string[];
};

type SupabaseMock = {
  tableResponses: Record<string, ResponseInput>;
  rpcResponses: Record<string, ResponseInput>;
  rpcCalls: Array<{ name: string; params: unknown }>;
  fromCalls: string[];
  queue: Queue;
  client: {
    from: (table: string) => unknown;
    rpc: (name: string, params: unknown) => Promise<unknown>;
    channel: (name: string) => unknown;
    removeChannel: (channel: unknown) => Promise<string>;
    auth: { getUser: () => Promise<{ data: { user: { id: string } }; error: null }> };
  };
};

export function createSupabaseMock(): SupabaseMock {
  const tableResponses: Record<string, ResponseInput> = {};
  const rpcResponses: Record<string, ResponseInput> = {};
  const rpcCalls: Array<{ name: string; params: unknown }> = [];
  const fromCalls: string[] = [];

  const makeChain = (table: string | null): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (typeof prop === "symbol") return undefined;
          if (prop === "then") {
            return (resolveFn: (v: SupabaseResponse<unknown>) => void) => {
              const t = table ?? "__no_table__";
              resolveFn(resolve(tableResponses[t]));
            };
          }
          if (prop === "single" || prop === "maybeSingle") {
            return () => {
              const t = table ?? "__no_table__";
              return Promise.resolve(resolve(tableResponses[t]));
            };
          }
          // Any chainable method returns a new chainable, preserving
          // the active table for the terminal resolve.
          return (..._args: unknown[]) => makeChain(table);
        },
      },
    );

  const makeChannel = () => {
    const obj = {
      on: () => obj,
      subscribe: (cb?: (status: string) => void) => {
        if (cb) cb("SUBSCRIBED");
        return obj;
      },
      unsubscribe: () => obj,
    };
    return obj;
  };

  return {
    tableResponses,
    rpcResponses,
    rpcCalls,
    fromCalls,
    queue: {
      tableResponse: (table, response) => {
        tableResponses[table] = response;
      },
      rpcResponse: (name, response) => {
        rpcResponses[name] = response;
      },
      rpcCalls,
      fromCalls,
    },
    client: {
      from: (table) => {
        fromCalls.push(table);
        return makeChain(table);
      },
      rpc: (name, params) => {
        rpcCalls.push({ name, params });
        return Promise.resolve(resolve(rpcResponses[name]));
      },
      channel: () => makeChannel(),
      removeChannel: () => Promise.resolve("ok"),
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null }),
      },
    },
  };
}

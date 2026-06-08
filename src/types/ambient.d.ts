/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Ambient declarations for modules without published types.
 *
 * `any` is unavoidable here because we are providing type information for
 * upstream packages that lack proper declarations (@supabase/realtime-js,
 * @tanstack/query-core, etc.). All callers immediately cast through Zod
 * schemas or domain types, so the `any` is contained within these shims.
 */

declare module "@cloudflare/vite-plugin";

/**
 * @supabase/realtime-js v2+ has mismatched type files (exports point
 * to .d.ts but only .d.cts is present). Provide minimal types for
 * the RealtimeChannel surface used by missionRealtimeBridge.
 */
declare module "@supabase/realtime-js" {
  export class RealtimeChannel {
    on(type: string, filter: Record<string, unknown>, callback: (payload: any) => void): this;
    subscribe(callback?: (status: string) => void): this;
    unsubscribe(): this;
  }
}

/**
 * @supabase/auth-js v2.106+ is missing dist/module/GoTrueClient.d.ts,
 * which breaks the type chain: SupabaseAuthClient extends AuthClient,
 * and AuthClient = typeof GoTrueClient, but GoTrueClient.d.ts is absent
 * in the module sub-path. Provide sufficient declarations so that
 * supabase.auth.{getUser,getSession,onAuthStateChange,signOut,signInWithOAuth}
 * resolve correctly.
 */
declare module "@supabase/auth-js" {
  export interface AuthChangeEvent {
    type: string;
  }

  export interface Subscription {
    unsubscribe: () => void;
  }

  export interface AuthOtpResponse {
    data: { user: AuthUser | null; session: AuthSession | null };
    error: Error | null;
  }

  export interface AuthResponse {
    data: { user: AuthUser | null; session: AuthSession | null };
    error: Error | null;
  }

  export interface OAuthResponse {
    data: { provider?: string; url: string | null };
    error: Error | null;
  }

  export interface SSOResponse {
    data: { provider?: string; url: string | null };
    error: Error | null;
  }

  export interface UserResponse {
    data: { user: AuthUser | null };
    error: Error | null;
  }

  export interface AuthTokenResponse {
    data: { user: AuthUser | null; session: AuthSession | null };
    error: Error | null;
  }

  export interface SignOut {
    error: Error | null;
  }

  export class GoTrueClient {
    constructor(options: Record<string, unknown>);

    admin: GoTrueAdminApi;
    mfa: GoTrueMFAApi;

    getUser(jwt?: string): Promise<UserResponse>;
    getSession(): Promise<{ data: { session: AuthSession | null }; error: Error | null }>;
    onAuthStateChange(
      callback: (event: string, session: AuthSession | null) => void | Promise<void>,
    ): { data: { subscription: Subscription } };
    signOut(options?: { scope?: "local" | "global" | "others" }): Promise<SignOut>;
    signInWithOAuth(credentials: {
      provider: string;
      options?: Record<string, unknown>;
    }): Promise<OAuthResponse>;
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<AuthTokenResponse>;
    signUp(credentials: {
      email: string;
      password: string;
      options?: Record<string, unknown>;
    }): Promise<AuthResponse>;
    setSession(currentSession: {
      access_token: string;
      refresh_token: string;
    }): Promise<AuthResponse>;
    refreshSession(currentSession?: { refresh_token: string }): Promise<AuthResponse>;
    updateUser(
      attributes: { email?: string; password?: string; data?: Record<string, unknown> },
      options?: { emailRedirectTo?: string },
    ): Promise<UserResponse>;
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string },
    ): Promise<{ data: Record<string, unknown>; error: Error | null }>;
    verifyOtp(params: {
      email?: string;
      phone?: string;
      token: string;
      type: string;
    }): Promise<AuthResponse>;
    reauthenticate(): Promise<AuthResponse>;
  }

  export class GoTrueAdminApi {
    constructor(options: Record<string, unknown>);
    createUser(attributes: {
      email: string;
      password?: string;
      email_confirm?: boolean;
      data?: Record<string, unknown>;
    }): Promise<UserResponse>;
    deleteUser(id: string): Promise<{ data: { user: AuthUser | null }; error: Error | null }>;
    getUserById(id: string): Promise<UserResponse>;
    listUsers(): Promise<{ data: { users: AuthUser[] }; error: Error | null }>;
    updateUserById(
      id: string,
      attributes: { email?: string; password?: string; data?: Record<string, unknown> },
    ): Promise<UserResponse>;
  }

  export class GoTrueMFAApi {
    constructor(options: Record<string, unknown>);
    enroll(params: {
      factorType: "totp" | "phone";
      friendlyName?: string;
      issuer?: string;
    }): Promise<{
      data: {
        id: string;
        type: string;
        totp: { qr_code: string; secret: string; uri: string };
      } | null;
      error: Error | null;
    }>;
    challenge(params: { factorId: string }): Promise<{
      data: {
        id: string;
        type: string;
        challenges: Array<{ id: string; created_at: string; ip: string }>;
      } | null;
      error: Error | null;
    }>;
    verify(params: {
      factorId: string;
      challengeId: string;
      code: string;
    }): Promise<{ data: { id: string; type: string } | null; error: Error | null }>;
    unenroll(params: {
      factorId: string;
    }): Promise<{ data: { id: string; type: string } | null; error: Error | null }>;
    list(): Promise<{
      data: { id: string; type: string; friendly_name?: string; status: string }[] | null;
      error: Error | null;
    }>;
    getAuthenticatorAssuranceLevel(): Promise<{
      data: {
        currentLevel: string | null;
        nextLevel: string | null;
        currentAuthenticationMethods: string[];
      };
      error: Error | null;
    }>;
  }

  /**
   * Re-export types from @supabase/supabase-js for backward compat
   * with SDK v2.106+ where Session/User were renamed to AuthSession/AuthUser.
   */
  export interface AuthUser {
    id: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    aud: string;
    email?: string;
    phone?: string;
    created_at: string;
    confirmed_at?: string;
    email_confirmed_at?: string;
    phone_confirmed_at?: string;
    last_sign_in_at?: string;
    role?: string;
    updated_at?: string;
    identities?: AuthIdentity[];
    factors?: AuthFactor[];
  }

  export interface AuthIdentity {
    id: string;
    user_id: string;
    identity_data: Record<string, unknown>;
    provider: string;
    created_at: string;
    last_sign_in_at?: string;
    updated_at?: string;
  }

  export interface AuthFactor {
    id: string;
    friendly_name?: string;
    factor_type: "totp" | "phone";
    status: "verified" | "unverified";
    created_at: string;
    updated_at: string;
  }

  /**
   * Session as returned by AuthClient. Supabase-js 2.106+ renames this
   * to `AuthSession` at the package boundary.
   */
  export interface AuthSession {
    provider_token?: string | null;
    provider_refresh_token?: string | null;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: AuthUser;
  }

  /** Legacy name kept for compatibility – use AuthSession for new code. */
  export type Session = AuthSession;
  /** Legacy name kept for compatibility – use AuthUser for new code. */
  export type User = AuthUser;

  /** Options for GoTrueClient constructor */
  export interface GoTrueClientOptions {
    url?: string;
    headers?: Record<string, string>;
    storageKey?: string;
    detectSessionInUrl?: boolean;
    flowType?: "implicit" | "pkce";
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    fetch?: typeof fetch;
  }

  /**
   * AuthClient is the default export from @supabase/auth-js.
   * Re-exported explicitly because dist/module/GoTrueClient.d.ts is missing.
   * Named export needed by @supabase/supabase-js imports.
   */
  export type AuthClient = GoTrueClient;
  export default GoTrueClient;
}

/**
 * @supabase/supabase-js has a broken type chain because it depends on
 * @supabase/auth-js (GoTrueClient.d.ts missing) and @supabase/realtime-js
 * (no .d.ts files). Provide a complete SupabaseClient surface covering
 * auth, storage, rpc, from, and channel methods used across the app.
 */
declare module "@supabase/supabase-js" {
  export type {
    AuthSession,
    AuthUser,
    AuthChangeEvent,
    Subscription,
    UserResponse,
    OAuthResponse,
    SignOut,
  } from "@supabase/auth-js";

  export function createClient<_Db = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): SupabaseClient;

  export class SupabaseClient {
    auth: SupabaseAuthClient;
    from(relation: string): PostgrestQueryBuilder;
    rpc(name: string, params?: Record<string, unknown>): Promise<PostgrestResponse>;
    channel(name: string): import("@supabase/realtime-js").RealtimeChannel;
    removeChannel(channel: unknown): Promise<string>;
    storage: StorageClient;
  }

  interface SupabaseAuthClient {
    getUser(jwt?: string): Promise<import("@supabase/auth-js").UserResponse>;
    getSession(): Promise<{
      data: { session: import("@supabase/auth-js").AuthSession | null };
      error: Error | null;
    }>;
    onAuthStateChange(
      callback: (
        event: string,
        session: import("@supabase/auth-js").AuthSession | null,
      ) => void | Promise<void>,
    ): { data: { subscription: import("@supabase/auth-js").Subscription } };
    signOut(options?: {
      scope?: "local" | "global" | "others";
    }): Promise<import("@supabase/auth-js").SignOut>;
    signInWithOAuth(credentials: {
      provider: string;
      options?: Record<string, unknown>;
    }): Promise<import("@supabase/auth-js").OAuthResponse>;
  }

  interface PostgrestQueryBuilder {
    select(
      columns?: string,
      options?: { head?: boolean; count?: "exact" | "planned" | "estimated" },
    ): PostgrestFilterBuilder;
    insert(values: any, options?: Record<string, unknown>): PostgrestFilterBuilder;
    upsert(values: any, options?: Record<string, unknown>): PostgrestFilterBuilder;
    update(values: Record<string, unknown>): PostgrestFilterBuilder;
    delete(options?: Record<string, unknown>): PostgrestFilterBuilder;
  }

  /** Builder returned by select/insert/update/delete — chainable then awaitable */
  interface PostgrestFilterBuilder extends PromiseLike<PostgrestResponse> {
    select(columns?: string, options?: Record<string, unknown>): this;
    eq(column: string, value: unknown): this;
    neq(column: string, value: unknown): this;
    gt(column: string, value: unknown): this;
    gte(column: string, value: unknown): this;
    lt(column: string, value: unknown): this;
    lte(column: string, value: unknown): this;
    like(column: string, pattern: string): this;
    ilike(column: string, pattern: string): this;
    is(column: string, value: unknown): this;
    in(column: string, values: unknown[]): this;
    contains(column: string, value: unknown): this;
    containedBy(column: string, value: unknown): this;
    range(from: number, to: number): this;
    rangeGt(column: string, range: string): this;
    rangeGte(column: string, range: string): this;
    rangeLt(column: string, range: string): this;
    rangeLte(column: string, range: string): this;
    rangeAdjacent(column: string, range: string): this;
    overlaps(column: string, value: unknown): this;
    textSearch(column: string, query: string, options?: Record<string, unknown>): this;
    filter(column: string, operator: string, value: unknown): this;
    not(column: string, operator: string, value: unknown): this;
    or(filters: string, options?: Record<string, unknown>): this;
    order(column: string, options?: Record<string, unknown>): this;
    limit(count: number, options?: Record<string, unknown>): this;
    single(): PostgrestFilterBuilder;
    maybeSingle(): PostgrestFilterBuilder;
    csv(): PostgrestFilterBuilder;
    url: URL;
    headers: Record<string, string>;
  }

  interface PostgrestResponse {
    data: any;
    error: PostgrestError | null;
    count: number | null;
    status: number;
    statusText: string;
  }

  interface PostgrestError {
    message: string;
    details: string;
    hint: string;
    code: string;
  }

  /** Minimal StorageClient surface needed by evidenceStorage */
  interface StorageClient {
    from(bucket: string): StorageBucket;
  }

  interface StorageBucket {
    upload(
      path: string,
      file: File | Blob | ArrayBuffer,
      options?: Record<string, unknown>,
    ): Promise<{ data: { path: string } | null; error: Error | null }>;
    download(path: string): Promise<{ data: Blob | null; error: Error | null }>;
    getPublicUrl(path: string, options?: Record<string, unknown>): { data: { publicUrl: string } };
    createSignedUrl(
      path: string,
      expiresIn: number,
      options?: Record<string, unknown>,
    ): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
    remove(paths: string[]): Promise<{ data: { path: string }[] | null; error: Error | null }>;
  }
}

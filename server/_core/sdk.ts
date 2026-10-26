import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "../../shared/const";
import { ForbiddenError } from "../../shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { createHash } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV, getSessionSecret } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

const CRON_OPEN_ID_PREFIX = "cron_";
const LOCAL_ADMIN_PREFIX = "admin_";
const LOCAL_CUSTOMER_PREFIX = "cust_";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  email?: string;
};

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true` and `taskUid`; see `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

type LocalAccountKind = "admin" | "customer";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** Stable openId for accounts that sign in on this site instead of through OAuth. */
export function buildLocalOpenId(kind: LocalAccountKind, email: string): string {
  const prefix = kind === "admin" ? LOCAL_ADMIN_PREFIX : LOCAL_CUSTOMER_PREFIX;
  // A hash of the whole address: a prefix of the email would merge accounts that share their first characters.
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").substring(0, 40);
  return `${prefix}${digest}`;
}

/**
 * Customer accounts are created from an email the visitor typed in, with no
 * proof of ownership. Never use such a session to unlock data keyed by email.
 */
export function isSelfDeclaredCustomer(user: Pick<User, "openId">): boolean {
  return user.openId.startsWith(LOCAL_CUSTOMER_PREFIX);
}

function getLocalAccountKind(openId: string): LocalAccountKind | null {
  if (openId.startsWith(LOCAL_ADMIN_PREFIX)) return "admin";
  if (openId.startsWith(LOCAL_CUSTOMER_PREFIX)) return "customer";
  return null;
}

/** Builds the user from the signed session when the database has no row (or is offline). */
function buildLocalUser(kind: LocalAccountKind, session: SessionPayload, signedInAt: Date): User {
  const isAdmin = kind === "admin";
  return {
    id: isAdmin ? 1 : 2,
    openId: session.openId,
    name: session.name || (isAdmin ? "CFJ Administrator" : "Customer"),
    email: session.email || (isAdmin ? ENV.adminEmail : null),
    phone: null,
    passwordHash: null,
    loginMethod: isAdmin ? "local_admin" : "customer_email",
    role: isAdmin ? "admin" : "user",
    createdAt: signedInAt,
    updatedAt: signedInAt,
    lastSignedIn: signedInAt,
  };
}

function buildCronUser(userInfo: GetUserInfoWithJwtResponse): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    phone: null,
    passwordHash: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  };
}

function deriveLoginMethod(platforms: unknown, fallback: string | null | undefined): string | null {
  if (fallback && fallback.length > 0) return fallback;
  if (!Array.isArray(platforms) || platforms.length === 0) return null;

  const set = new Set<string>(platforms.filter((p): p is string => typeof p === "string"));
  if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
  if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
  if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
  if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE")) return "microsoft";
  if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";

  const first = Array.from(set)[0];
  return first ? first.toLowerCase() : null;
}

/** Normalises the OAuth profile so `platform` and `loginMethod` always agree. */
function withLoginMethod<T extends GetUserInfoResponse>(data: T): T {
  const { platforms } = data as T & { platforms?: unknown };
  const loginMethod = deriveLoginMethod(platforms, data.platform ?? null);
  return { ...data, platform: loginMethod, loginMethod };
}

function readSessionToken(req: Request): string | undefined {
  // 1. Prefer the session cookie (regular login).
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieToken = cookies[COOKIE_NAME];
  if (cookieToken) return cookieToken;

  // 2. Fallback to the Authorization header (Preview auto-login via
  //    sessionStorage), used when the browser blocks iframe cookies such as
  //    Safari ITP, private browsing, or iOS/Android WebView.
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return undefined;
}

class SDKServer {
  private readonly client: AxiosInstance;

  constructor(client: AxiosInstance = axios.create({ baseURL: ENV.oAuthServerUrl, timeout: AXIOS_TIMEOUT_MS })) {
    this.client = client;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code: string, state: string): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: decodeOAuthState(state).redirectUri,
    };
    const { data } = await this.client.post<ExchangeTokenResponse>(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(GET_USER_INFO_PATH, { accessToken });
    return withLoginMethod(data);
  }

  async getUserInfoWithJwt(jwtToken: string): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = { jwtToken, projectId: ENV.appId };
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(GET_USER_INFO_WITH_JWT_PATH, payload);
    return withLoginMethod(data);
  }

  /**
   * Create a signed session token for a user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; email?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    const payload: SessionPayload = {
      openId,
      appId: ENV.appId,
      name: options.name || "",
      ...(options.email ? { email: options.email } : {}),
    };

    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(new TextEncoder().encode(getSessionSecret()));
  }

  async verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(getSessionSecret()), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, email } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing required openId");
        return null;
      }

      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : ENV.appId,
        name: isNonEmptyString(name) ? name : "",
        email: isNonEmptyString(email) ? email : undefined,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const sessionToken = readSessionToken(req);
    const session = await this.verifySession(sessionToken);
    if (!session || !sessionToken) {
      throw ForbiddenError("Invalid session cookie");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken);
      if (!userInfo.taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }

    const signedInAt = new Date();
    const user =
      (await db.getUserByOpenId(session.openId)) ??
      (await this.resolveMissingUser(session, sessionToken, signedInAt));
    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
    return user;
  }

  /** Recovers a user that has a valid session but no database row yet. */
  private async resolveMissingUser(
    session: SessionPayload,
    sessionToken: string,
    signedInAt: Date
  ): Promise<User | undefined> {
    const localKind = getLocalAccountKind(session.openId);
    if (localKind) return buildLocalUser(localKind, session, signedInAt);

    try {
      const userInfo = await this.getUserInfoWithJwt(sessionToken);
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: signedInAt,
      });
      return await db.getUserByOpenId(userInfo.openId);
    } catch (error) {
      console.error("[Auth] Failed to sync user from OAuth:", error);
      throw ForbiddenError("Failed to sync user info");
    }
  }
}

export const sdk = new SDKServer();

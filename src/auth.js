/**
 * Bowimi auth client.
 *
 * Supports two modes:
 *   1. API key (BOWIMI_API_KEY): static Bearer token, no login needed
 *   2. Email/password (BOWIMI_EMAIL + BOWIMI_PASSWORD): session-based flow
 */

const BASE_APP = "https://app.bowimi.com";

export class BowimiAuth {
  constructor({ email, password, subdomain, apiKey }) {
    this.email = email;
    this.password = password;
    this.subdomain = subdomain;
    this._staticToken = apiKey || null;
    this.cookieJar = {};
    this._token = null;
    this._tokenExpiry = 0;
  }

  get apiBase() {
    return `https://${this.subdomain}.bowimi.com/_api`;
  }

  // ── cookie helpers ──────────────────────────────────────────────────────────

  _parseCookies(headerValue, existing = {}) {
    const jar = { ...existing };
    for (const part of headerValue.split(",")) {
      const [kv] = part.trim().split(";");
      const eq = kv.indexOf("=");
      if (eq === -1) continue;
      const name = kv.slice(0, eq).trim();
      const value = kv.slice(eq + 1).trim();
      jar[name] = value;
    }
    return jar;
  }

  _cookieHeader() {
    return Object.entries(this.cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async _fetchWithCookies(url, opts = {}) {
    const headers = {
      "Content-Type": "application/json",
      Cookie: this._cookieHeader(),
      ...(opts.headers || {}),
    };
    const res = await fetch(url, { ...opts, headers });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      this.cookieJar = this._parseCookies(setCookie, this.cookieJar);
    }
    return res;
  }

  // ── login ────────────────────────────────────────────────────────────────────

  async login() {
    // Step 1: credentials
    const r1 = await this._fetchWithCookies(
      `${BASE_APP}/api/login-with-password`,
      {
        method: "POST",
        body: JSON.stringify({ email: this.email, password: this.password }),
      }
    );
    if (!r1.ok) {
      const body = await r1.text();
      throw new Error(`Login failed (${r1.status}): ${body}`);
    }

    // Step 2: get account list + token details
    const r2 = await this._fetchWithCookies(
      `${BASE_APP}/api/login-token-details`,
      { method: "QUERY", body: JSON.stringify({}) }
    );
    const tokenDetails = await r2.json();

    // Find the target account by subdomain
    const accounts =
      tokenDetails.accounts || tokenDetails.data?.accounts || [];
    let accountUuid = null;
    for (const acc of accounts) {
      if (
        acc.subdomain === this.subdomain ||
        acc.accountUuid === this.subdomain
      ) {
        accountUuid = acc.accountUuid;
        break;
      }
    }
    if (!accountUuid && accounts.length === 1) {
      accountUuid = accounts[0].accountUuid;
    }
    if (!accountUuid) {
      throw new Error(
        `Account "${this.subdomain}" not found. Available: ${accounts.map((a) => a.subdomain).join(", ")}`
      );
    }

    // Step 3: complete login (selects account)
    const r3 = await this._fetchWithCookies(
      `${BASE_APP}/api/complete-login`,
      {
        method: "POST",
        body: JSON.stringify({ accountUuid }),
      }
    );
    if (!r3.ok) {
      throw new Error(`complete-login failed (${r3.status})`);
    }

    // Step 4: get bearer token
    await this._refreshToken();
  }

  async _refreshToken() {
    const url = `https://${this.subdomain}.bowimi.com/_auth/token`;
    const res = await this._fetchWithCookies(url);
    if (!res.ok) {
      throw new Error(`Token refresh failed (${res.status}) — re-login needed`);
    }
    const token = (await res.text()).trim().replace(/^"|"$/g, "");
    this._token = token;
    // Tokens live ~5 min; refresh at 4 min
    this._tokenExpiry = Date.now() + 4 * 60 * 1000;
  }

  async getToken() {
    if (this._staticToken) return this._staticToken;
    if (!this._token || Date.now() > this._tokenExpiry) {
      if (!this._token) {
        await this.login();
      } else {
        try {
          await this._refreshToken();
        } catch {
          await this.login();
        }
      }
    }
    return this._token;
  }

  // ── authenticated fetch ───────────────────────────────────────────────────

  async fetch(path, opts = {}) {
    const token = await this.getToken();
    const url = path.startsWith("http")
      ? path
      : `${this.apiBase}/${path.replace(/^\//, "")}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Cookie: this._cookieHeader(),
      ...(opts.headers || {}),
    };

    const res = await fetch(url, { ...opts, headers });

    // Token expired mid-flight
    if (res.status === 401) {
      await this.login();
      const token2 = await this.getToken();
      headers.Authorization = `Bearer ${token2}`;
      return fetch(url, { ...opts, headers });
    }

    return res;
  }
}

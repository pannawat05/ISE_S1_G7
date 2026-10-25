import { createSign } from "node:crypto";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface GoogleGroupMember {
  email?: string;
  type?: string;
  status?: string;
}

interface GoogleMembersResponse {
  members?: GoogleGroupMember[];
  nextPageToken?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function getServiceAccount(): GoogleServiceAccount {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? (encoded ? Buffer.from(encoded, "base64").toString("utf8") : "");
  if (!raw) throw new Error("Google Groups integration is not configured");

  let account: GoogleServiceAccount;
  try {
    account = JSON.parse(raw) as GoogleServiceAccount;
  } catch {
    throw new Error("Google Groups service account configuration is invalid");
  }
  if (!account.client_email || !account.private_key) {
    throw new Error("Google Groups service account configuration is incomplete");
  }
  if (!process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL) {
    throw new Error("Google Groups administrator impersonation is not configured");
  }
  return account;
}

async function getAccessToken(account: GoogleServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encodeBase64Url(JSON.stringify({
    iss: account.client_email,
    sub: process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL,
    scope: "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${signer.sign(account.private_key).toString("base64url")}`;
  const tokenUrl = account.token_uri || "https://oauth2.googleapis.com/token";
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("Unable to authenticate with Google Workspace");

  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google Workspace did not return an access token");
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
}

export async function fetchGoogleGroupMemberEmails(groupEmail: string): Promise<string[]> {
  if (!isValidEmail(groupEmail)) throw new Error("กรุณาระบุอีเมล Google Group ที่ถูกต้อง");

  const account = getServiceAccount();
  const token = await getAccessToken(account);
  const emails = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`,
    );
    url.searchParams.set("maxResults", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Google Workspace ปฏิเสธสิทธิ์อ่านสมาชิกกลุ่ม กรุณาตรวจสอบ Admin SDK และ Groups read scope");
      }
      if (response.status === 404) throw new Error("ไม่พบ Google Group นี้");
      throw new Error("ไม่สามารถดึงรายชื่อสมาชิกจาก Google Groups ได้");
    }

    const data = await response.json() as GoogleMembersResponse;
    for (const member of data.members ?? []) {
      const email = member.email?.trim().toLowerCase();
      if (member.type === "USER" && member.status !== "SUSPENDED" && email && isValidEmail(email)) {
        emails.add(email);
      }
    }
    pageToken = data.nextPageToken;
    if (emails.size > 1000) throw new Error("Google Group มีสมาชิกเกินขีดจำกัด 1,000 คนต่อ batch");
  } while (pageToken);

  return [...emails];
}

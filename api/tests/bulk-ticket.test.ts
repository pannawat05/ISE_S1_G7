import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createInvitationToken, hashInvitationToken } from "../lib/bulkTicketTokens.js";
import { fetchGoogleGroupMemberEmails, isValidEmail } from "../lib/googleGroups.js";
import { createTicketQrCode } from "../lib/ticketCodes.js";

test("invitation tokens are unique opaque values and are stored as hashes", () => {
  const first = createInvitationToken();
  const second = createInvitationToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.match(hashInvitationToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashInvitationToken(first), first);
  assert.equal(hashInvitationToken(first), hashInvitationToken(first));

  const firstQr = createTicketQrCode();
  const secondQr = createTicketQrCode();
  assert.match(firstQr, /^MT-[0-9a-f-]{36}$/i);
  assert.notEqual(firstQr, secondQr);
});

test("Google Group member lookup paginates, filters and caps results", async (t) => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const originalFetch = globalThis.fetch;
  const envKeys = ["GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT_JSON_B64", "GOOGLE_ADMIN_IMPERSONATE_EMAIL"] as const;
  const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
  let tokenRequests = 0;

  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: "service@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    token_uri: "https://oauth2.googleapis.com/token",
  });
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL = "admin@example.edu";

  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof URL ? input : String(input));
    if (url.hostname === "oauth2.googleapis.com") {
      tokenRequests++;
      return new Response(JSON.stringify({ access_token: "test-access-token", expires_in: 3600 }), { status: 200 });
    }

    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-access-token");
    if (decodeURIComponent(url.pathname).endsWith("/event-staff@example.edu/members")) {
      if (url.searchParams.get("pageToken") === "next") {
        return new Response(JSON.stringify({
          members: [{ email: "BOB@example.edu", type: "USER", status: "ACTIVE" }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        members: [
          { email: "alice@example.edu", type: "USER", status: "ACTIVE" },
          { email: "ALICE@example.edu", type: "USER", status: "ACTIVE" },
          { email: "suspended@example.edu", type: "USER", status: "SUSPENDED" },
          { email: "nested@example.edu", type: "GROUP", status: "ACTIVE" },
        ],
        nextPageToken: "next",
      }), { status: 200 });
    }

    const members = Array.from({ length: 1001 }, (_, index) => ({
      email: `member${index}@example.edu`,
      type: "USER",
      status: "ACTIVE",
    }));
    return new Response(JSON.stringify({ members }), { status: 200 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  assert.equal(isValidEmail("event-staff@example.edu"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.deepEqual(
    await fetchGoogleGroupMemberEmails("event-staff@example.edu"),
    ["alice@example.edu", "bob@example.edu"],
  );
  await assert.rejects(
    fetchGoogleGroupMemberEmails("large-group@example.edu"),
    /1,000/,
  );
  assert.equal(tokenRequests, 1);
});

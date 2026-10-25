import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseGroupWhitelistCsv,
  validateGroupWhitelistRows,
} from "../lib/groupWhitelistCsv.js";

test("parses CSV headers, quoted commas and normalizes member emails", () => {
  const rows = parseGroupWhitelistCsv(
    '\uFEFFemail,name\r\nAlice@example.com,"Alice, Smith"\r\nbob@example.com,Bob',
  );

  assert.deepEqual(rows, [
    { email: "alice@example.com", name: "Alice, Smith", row: 2 },
    { email: "bob@example.com", name: "Bob", row: 3 },
  ]);
});

test("reports malformed and duplicate group whitelist rows", () => {
  const rows = validateGroupWhitelistRows(
    parseGroupWhitelistCsv(
      "email,name\nnot-an-email,Invalid\nperson@example.com,Person\nPERSON@example.com,Duplicate\n",
    ),
  );

  assert.equal(rows[0]?.error, "Invalid email address");
  assert.equal(rows[1]?.error, undefined);
  assert.equal(rows[2]?.error, "Duplicate email in CSV");
});

test("rejects unsupported CSV headers and oversized imports", () => {
  assert.throws(() => parseGroupWhitelistCsv("email,username\nuser@example.com,User"), /email and name/);
  assert.throws(
    () => parseGroupWhitelistCsv('email,name\nuser@example.com,"Unclosed'),
    /unclosed quoted field/,
  );
  assert.throws(
    () => parseGroupWhitelistCsv('email,name\nuser@example.com,"User"x'),
    /characters after a quoted field/,
  );
  assert.throws(
    () => validateGroupWhitelistRows(
      Array.from({ length: 2 }, (_, index) => ({
        email: `person${index}@example.com`,
        name: "Person",
        row: index + 2,
      })),
      1,
    ),
    /at most 1 members/,
  );
});

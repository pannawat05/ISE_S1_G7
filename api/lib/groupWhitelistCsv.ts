export interface GroupWhitelistMember {
  email: string;
  name: string;
  row: number;
}

export interface GroupWhitelistCsvRow extends GroupWhitelistMember {
  error?: string;
}

export function parseGroupWhitelistCsv(csv: string): GroupWhitelistCsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let quoteClosed = false;

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index]!;
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (quoteClosed) {
      if (character === ",") {
        row.push(field);
        field = "";
        quoteClosed = false;
      } else if (character === "\n" || character === "\r") {
        if (character === "\r" && csv[index + 1] === "\n") index++;
        row.push(field);
        if (row.some((value) => value.trim() !== "")) rows.push(row);
        row = [];
        field = "";
        quoteClosed = false;
      } else {
        throw new Error("CSV contains characters after a quoted field");
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) throw new Error("CSV contains an unexpected quote");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) throw new Error("CSV is empty");

  const headers = rows[0]!.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim().toLowerCase(),
  );
  const emailColumn = headers.indexOf("email");
  const nameColumn = headers.indexOf("name");
  if (emailColumn === -1 || nameColumn === -1) {
    throw new Error("CSV must include email and name columns");
  }

  const members = rows.slice(1).map((values, index) => ({
    email: (values[emailColumn] ?? "").trim().toLowerCase(),
    name: (values[nameColumn] ?? "").trim(),
    row: index + 2,
  }));
  if (members.length === 0) throw new Error("CSV contains no members");
  return members;
}

export function validateGroupWhitelistRows(
  rows: GroupWhitelistCsvRow[],
  maxRecords = 500,
): GroupWhitelistCsvRow[] {
  if (rows.length > maxRecords) {
    throw new Error(`CSV can contain at most ${maxRecords} members`);
  }

  const seen = new Set<string>();
  return rows.map((member) => {
    if (member.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
      return { ...member, error: "Invalid email address" };
    }
    const [firstName = "", ...lastNameParts] = member.name.split(/\s+/);
    if (
      !member.name ||
      member.name.length > 200 ||
      firstName.length > 100 ||
      lastNameParts.join(" ").length > 100
    ) {
      return { ...member, error: "Name is required and must fit the 100-character name fields" };
    }
    if (seen.has(member.email)) {
      return { ...member, error: "Duplicate email in CSV" };
    }
    seen.add(member.email);
    return member;
  });
}

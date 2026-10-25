export interface GroupWhitelistMember {
  email: string;
  name: string;
  row: number;
}

export interface GroupWhitelistCsvRow extends GroupWhitelistMember {
  error?: string;
}

export interface ParsedGroupWhitelistCsv {
  groupName: string;
  members: GroupWhitelistCsvRow[];
}

export function parseGroupWhitelistCsv(csv: string): ParsedGroupWhitelistCsv {
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

  const headerIndex = rows.slice(0, 10).findIndex((values, rowIndex) => {
    const headers = values.map((header, columnIndex) =>
      rowIndex === 0 && columnIndex === 0
        ? header.replace(/^\uFEFF/, "").trim().toLowerCase()
        : header.trim().toLowerCase(),
    );
    return headers.includes("email") && headers.includes("name");
  });
  if (headerIndex === -1) {
    throw new Error("CSV must include email and name columns");
  }

  const headers = rows[headerIndex]!.map((header, columnIndex) =>
    headerIndex === 0 && columnIndex === 0
      ? header.replace(/^\uFEFF/, "").trim().toLowerCase()
      : header.trim().toLowerCase(),
  );
  const emailColumn = headers.indexOf("email");
  const nameColumn = headers.indexOf("name");
  const preambleRows = rows.slice(0, headerIndex);
  const groupLabel = preambleRows
    .map((values) => values.map((value) => value.trim()).filter(Boolean).join(" "))
    .find((value) => value && !/^สมาชิกของกลุ่ม\s*/i.test(value));
  const groupDescription = preambleRows
    .map((values) => values.map((value) => value.trim()).filter(Boolean).join(" "))
    .find((value) => /^สมาชิกของกลุ่ม\s*/i.test(value));
  const describedGroupName = groupDescription?.replace(/^สมาชิกของกลุ่ม\s*/i, "").trim();
  const groupName = describedGroupName || groupLabel || "";
  const members = rows.slice(headerIndex + 1).map((values, index) => ({
    email: (values[emailColumn] ?? "").trim().toLowerCase(),
    name: (values[nameColumn] ?? "").trim(),
    row: headerIndex + index + 2,
  }));
  if (members.length === 0) throw new Error("CSV contains no members");
  return { groupName, members };
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

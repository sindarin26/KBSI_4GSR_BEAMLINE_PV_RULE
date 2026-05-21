// YAML subset parser — supports only the following subset of YAML 1.2:
//   Supported:
//     - Block mappings (objects) at any nesting depth
//     - Block sequences (lists) using "- " prefix
//     - Scalars: bare string, single-quoted ('...'), double-quoted ("..."),
//       integer, float, boolean (true/false), null (~)
//     - Inline empty containers: [] and {}
//   NOT supported (will throw or silently misbehave):
//     - Block scalars: literal (|) and folded (>) styles
//     - Anchors and aliases: & and *
//     - Flow-style mappings: { key: val }
//     - Flow-style sequences: [ val1, val2 ]
//     - Quoted map keys — keys must match [A-Za-z_][A-Za-z0-9_-]*
//     - Multi-document streams (--- separator between documents)
//     - YAML tags (!!)
//     - Merge keys (<<)
// Schema files, registry YAML, and exception frontmatter must stay within this
// subset. If a future edit silently falls outside it, the parser will either
// throw or return unexpected values — there is no graceful degradation.

const fs = require("fs");

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    if (value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch {
        return value.slice(1, -1);
      }
    }
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function splitKeyValue(text) {
  const index = text.indexOf(":");
  if (index < 0) return null;
  const key = text.slice(0, index).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) return null;
  return [key, text.slice(index + 1).trim()];
}

function prepareLines(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const indent = line.match(/^ */)[0].length;
      return { indent, text: line.trimEnd().trim() };
    })
    .filter((line) => line.text !== "" && !line.text.startsWith("#"));
}

function parseYaml(text) {
  const lines = prepareLines(text);
  if (lines.length === 0) return null;

  function parseBlock(index, indent) {
    if (index >= lines.length || lines[index].indent < indent) return [null, index];

    if (lines[index].indent === indent && lines[index].text.startsWith("- ")) {
      const array = [];
      while (
        index < lines.length &&
        lines[index].indent === indent &&
        lines[index].text.startsWith("- ")
      ) {
        const itemText = lines[index].text.slice(2).trim();
        if (itemText === "") {
          const [child, next] = parseBlock(index + 1, indent + 2);
          array.push(child);
          index = next;
          continue;
        }

        const pair = splitKeyValue(itemText);
        if (pair) {
          const [key, rawValue] = pair;
          const item = {};
          index += 1;
          if (rawValue === "") {
            const [child, next] = parseBlock(index, indent + 2);
            item[key] = child;
            index = next;
          } else {
            item[key] = parseScalar(rawValue);
          }
          if (index < lines.length && lines[index].indent >= indent + 2) {
            const [child, next] = parseBlock(index, indent + 2);
            if (child && typeof child === "object" && !Array.isArray(child)) {
              Object.assign(item, child);
            } else if (child !== null) {
              item.value = child;
            }
            index = next;
          }
          array.push(item);
          continue;
        }

        array.push(parseScalar(itemText));
        index += 1;
      }
      return [array, index];
    }

    const object = {};
    while (
      index < lines.length &&
      lines[index].indent === indent &&
      !lines[index].text.startsWith("- ")
    ) {
      const pair = splitKeyValue(lines[index].text);
      if (!pair) {
        throw new Error(`Unsupported YAML line: ${lines[index].text}`);
      }
      const [key, rawValue] = pair;
      index += 1;
      if (rawValue === "") {
        const [child, next] = parseBlock(index, indent + 2);
        object[key] = child;
        index = next;
      } else {
        object[key] = parseScalar(rawValue);
      }
    }
    return [object, index];
  }

  const [parsed, index] = parseBlock(0, lines[0].indent);
  if (index !== lines.length) {
    throw new Error(`Unsupported YAML structure near line ${index + 1}`);
  }
  return parsed;
}

function parseYamlFile(path) {
  return parseYaml(fs.readFileSync(path, "utf8"));
}

function parseFrontmatterMarkdown(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) return null;
  return parseYaml(normalized.slice(4, end));
}

// Serialize a value to the YAML subset understood by parseYaml.
// Rules:
//   - strings   → double-quoted (JSON.stringify)
//   - numbers   → bare decimal
//   - null/undefined → bare null
//   - booleans  → bare true/false
//   - arrays    → block sequence ("- ") at the given indent
//   - objects   → block mapping at the given indent
// Produces output compatible with the existing pv_registry.yaml format.
function serializeYaml(value, indent) {
  indent = indent || 0;
  const pad = " ".repeat(indent);

  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const lines = [];
    for (const item of value) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const entries = Object.entries(item);
        if (entries.length === 0) { lines.push(`${pad}- {}`); continue; }
        const [firstKey, firstVal] = entries[0];
        if (firstVal !== null && typeof firstVal === "object") {
          lines.push(`${pad}- ${firstKey}:`);
          if (Array.isArray(firstVal) && firstVal.length === 0) {
            lines[lines.length - 1] += " []";
          } else {
            lines.push(serializeYaml(firstVal, indent + 4));
          }
        } else {
          lines.push(`${pad}- ${firstKey}: ${serializeScalar(firstVal)}`);
        }
        for (const [key, val] of entries.slice(1)) {
          if (val !== null && typeof val === "object") {
            if (Array.isArray(val) && val.length === 0) {
              lines.push(`${pad}  ${key}: []`);
            } else {
              lines.push(`${pad}  ${key}:`);
              lines.push(serializeYaml(val, indent + 4));
            }
          } else {
            lines.push(`${pad}  ${key}: ${serializeScalar(val)}`);
          }
        }
      } else {
        lines.push(`${pad}- ${serializeYaml(item, 0)}`);
      }
    }
    return lines.join("\n");
  }

  // Object/mapping
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  const lines = [];
  for (const [key, val] of entries) {
    if (val !== null && typeof val === "object") {
      if (Array.isArray(val) && val.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else if (!Array.isArray(val) && Object.keys(val).length === 0) {
        lines.push(`${pad}${key}: {}`);
      } else {
        lines.push(`${pad}${key}:`);
        lines.push(serializeYaml(val, indent + 2));
      }
    } else {
      lines.push(`${pad}${key}: ${serializeScalar(val)}`);
    }
  }
  return lines.join("\n");
}

function serializeScalar(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number") return String(val);
  return JSON.stringify(String(val));
}

module.exports = {
  parseYaml,
  parseYamlFile,
  parseFrontmatterMarkdown,
  serializeYaml,
};

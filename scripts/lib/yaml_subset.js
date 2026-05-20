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

module.exports = {
  parseYaml,
  parseYamlFile,
  parseFrontmatterMarkdown,
};

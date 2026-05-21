const COMPONENT_FIELDS = ["section", "port", "area", "device", "subdevice", "signal"];

const SEO_V3_PV_REGEX =
  /^(?<section>[A-Z]+)(?<port>[0-9]{2}[A-Z])-(?<area>[A-Z0-9]+):(?<device>[A-Z0-9]+)-(?<subdevice>[A-Z0-9]+):(?<signal>[A-Z][A-Za-z0-9]*)$/;

function renderStandardPv(components) {
  const missing = COMPONENT_FIELDS.filter((field) => !components || !components[field]);
  if (missing.length > 0) {
    throw new Error(`missing component field(s): ${missing.join(", ")}`);
  }
  return (
    `${components.section}${components.port}-${components.area}:` +
    `${components.device}-${components.subdevice}:${components.signal}`
  );
}

function parseStandardPv(value) {
  if (typeof value !== "string" || value.length === 0) {
    return { ok: false, errors: ["standardPv must be a non-empty string"] };
  }

  const match = value.match(SEO_V3_PV_REGEX);
  if (!match) {
    return { ok: false, errors: [`standardPv does not match SEO_V3 grammar: ${value}`] };
  }

  return {
    ok: true,
    components: {
      section: match.groups.section,
      port: match.groups.port,
      area: match.groups.area,
      device: match.groups.device,
      subdevice: match.groups.subdevice,
      signal: match.groups.signal,
    },
    errors: [],
  };
}

function componentSnapshot(row) {
  return Object.fromEntries(COMPONENT_FIELDS.map((field) => [field, row[field]]));
}

function validateComponentFields(row, label = "row") {
  const errors = [];
  for (const field of COMPONENT_FIELDS) {
    if (!row || row[field] === undefined || row[field] === null || row[field] === "") {
      errors.push(`${label}.${field} is required`);
    }
  }
  return errors;
}

function validateSourceRow(row, label = "row") {
  const errors = validateComponentFields(row, label);

  if (!row || typeof row.standardPv !== "string" || row.standardPv.length === 0) {
    errors.push(`${label}.standardPv is required`);
    return errors;
  }

  const parsed = parseStandardPv(row.standardPv);
  if (!parsed.ok) {
    errors.push(...parsed.errors.map((error) => `${label}: ${error}`));
    return errors;
  }

  if (errors.length > 0) {
    return errors;
  }

  const rendered = renderStandardPv(componentSnapshot(row));
  if (rendered !== row.standardPv) {
    errors.push(
      `${label}.standardPv mismatch: components render ${rendered}, found ${row.standardPv}`,
    );
  }

  for (const field of COMPONENT_FIELDS) {
    if (parsed.components[field] !== row[field]) {
      errors.push(
        `${label}.${field} mismatch: standardPv has ${parsed.components[field]}, row has ${row[field]}`,
      );
    }
  }

  return errors;
}

module.exports = {
  COMPONENT_FIELDS,
  SEO_V3_PV_REGEX,
  componentSnapshot,
  parseStandardPv,
  renderStandardPv,
  validateComponentFields,
  validateSourceRow,
};

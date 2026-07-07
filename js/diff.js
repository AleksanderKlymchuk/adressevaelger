const FIELDS = [
  { key: "text", label: "Adressetekst" },
  { key: "road", label: "Vejnavn" },
  { key: "houseNo", label: "Husnummer" },
  { key: "floor", label: "Etage" },
  { key: "door", label: "Dør" },
  { key: "postcode", label: "Postnummer" },
  { key: "city", label: "By" },
];

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().replace(/\s+/g, " ");
}

export function diffNormalizedFields(a, b) {
  return FIELDS.map(({ key, label }) => {
    const aValue = a ? a[key] : null;
    const bValue = b ? b[key] : null;

    return {
      field: key,
      label,
      a: aValue,
      b: bValue,
      differs: normalizeValue(aValue) !== normalizeValue(bValue),
    };
  });
}

export function diffTopLevelKeys(objA, objB) {
  const keysA = new Set(objA ? Object.keys(objA) : []);
  const keysB = new Set(objB ? Object.keys(objB) : []);

  return {
    onlyInA: [...keysA].filter((key) => !keysB.has(key)),
    onlyInB: [...keysB].filter((key) => !keysA.has(key)),
    common: [...keysA].filter((key) => keysB.has(key)),
  };
}

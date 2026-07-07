const TITEL_PATTERN =
  /^(.*?)\s+(\d+[A-Za-z]?),\s*(?:(st|\d+)\.\s*([a-zæøåA-ZÆØÅ]+)\.?,\s*)?(\d{4})\s+(.+)$/i;

export function pick(obj, paths) {
  if (!obj) {
    return null;
  }

  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

export function parseTitel(titel) {
  if (!titel) {
    return null;
  }

  const match = TITEL_PATTERN.exec(titel.trim());
  if (!match) {
    return null;
  }

  return {
    road: match[1] || null,
    houseNo: match[2] || null,
    floor: match[3] || null,
    door: match[4] || null,
    postcode: match[5] || null,
    city: match[6] || null,
  };
}

function composeText({ road, houseNo, floor, door, postcode, city }) {
  if (!road && !postcode) {
    return null;
  }

  const houseAndFloor = [houseNo, floor && door ? `${floor}. ${door}.` : null]
    .filter(Boolean)
    .join(", ");
  const line1 = [road, houseAndFloor].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

// IMPORTANT: This normalizes autocomplete search results. The parsed fields are NOT authoritative
// and should NEVER be used for comparison. They are only for display purposes (showing result titles).
// All field comparisons must use normalizeAdressevaelgerDetail() instead, which extracts from
// the authoritative lookup-by-ID response.
export function normalizeAdressevaelgerSearchItem(item) {
  const parsed = parseTitel(item && item.titel);

  return {
    source: "adressevaelger",
    text: (item && item.titel) || null,
    id: (item && item.id) || null,
    road: parsed ? parsed.road : null,
    houseNo: parsed ? parsed.houseNo : null,
    floor: parsed ? parsed.floor : null,
    door: parsed ? parsed.door : null,
    postcode: parsed ? parsed.postcode : null,
    city: parsed ? parsed.city : null,
    confidence: parsed ? "parsed" : "unknown",
  };
}

export function normalizeAdressevaelgerDetail(obj) {
  // Extract from actual Adressevælger lookup response structure (authoritative)
  let road = pick(obj, [
    "vejnavn",                                    // Direct field in lookup
    "navngivenvej.navn",                          // Fallback path 1
    "adgangsadresse.navngivenvej.navn",          // Fallback path 2
    "navngivenvejpostnummer.navngivenvej.navn",  // Fallback path 3
  ]);

  let houseNo = pick(obj, [
    "husnummertekst",                            // Direct field in lookup
    "husnummer",                                  // Fallback field
    "husnr",                                      // Fallback field
    "adgangsadresse.husnummer",                  // Fallback path
    "adgangsadresse.husnr",                      // Fallback path
  ]);

  let floor = pick(obj, ["etage", "adresse.etage"]);
  let door = pick(obj, ["dør", "dor", "adresse.dør", "adresse.dor"]);

  let postcode = pick(obj, [
    "postnummer",                                 // Direct field in lookup (not nested)
    "postnummer.nr",                             // Fallback nested path
    "navngivenvejpostnummer.postnummer.nr",      // Fallback path
    "postnr",                                     // Fallback field
  ]);

  let city = pick(obj, [
    "postdistrikt",                              // Direct field in lookup
    "postnummer.navn",                           // Fallback nested path
    "navngivenvejpostnummer.postnummer.navn",    // Fallback path
    "postnrnavn",                                 // Fallback field
  ]);

  // Authoritative text field from lookup response
  const fallbackText = pick(obj, [
    "adgangsadressebetegnelse",                  // Direct field in lookup
    "adressebetegnelse",                         // Fallback field
    "formateretadresse",                         // Fallback field
    "betegnelse",                                 // Fallback field
  ]);

  // Only parse from text if we couldn't extract fields directly (indicates different API structure)
  if (!road && fallbackText) {
    const parsed = parseTitel(fallbackText);
    if (parsed) {
      road = road || parsed.road;
      houseNo = houseNo || parsed.houseNo;
      floor = floor || parsed.floor;
      door = door || parsed.door;
      postcode = postcode || parsed.postcode;
      city = city || parsed.city;
    }
  }

  const text = fallbackText || composeText({ road, houseNo, floor, door, postcode, city });

  // Extract ID from actual field in lookup response
  const id = pick(obj, [
    "id_lokalid",                                // Direct field in lookup
    "id",                                         // Fallback field
  ]);

  return {
    source: "adressevaelger",
    text,
    id,
    road,
    houseNo,
    floor,
    door,
    postcode,
    city,
    confidence: road || postcode ? "lookup" : "unknown",
  };
}

// IMPORTANT: This normalizes autocomplete search results. The extracted fields are NOT authoritative
// and should NEVER be used for comparison. They are only for display purposes.
// All field comparisons must use normalizeDawaDetail() instead, which extracts from
// the authoritative lookup-by-ID response.
export function normalizeDawaSearchItem(item, kind) {
  const nestedKey = kind === "husnummer" ? "adgangsadresse" : "adresse";
  const nested = item && item[nestedKey];

  return {
    source: "dawa",
    text: (item && item.tekst) || null,
    id: (nested && nested.id) || null,
    road: pick(nested, ["vejstykke.navn"]),
    houseNo: pick(nested, ["husnr"]),
    floor: pick(nested, ["etage"]),
    door: pick(nested, ["dør", "dor"]),
    postcode: pick(nested, ["postnummer.nr"]),
    city: pick(nested, ["postnummer.navn"]),
    confidence: "parsed",
  };
}

export function normalizeDawaDetail(obj) {
  const road = pick(obj, ["vejstykke.navn", "adgangsadresse.vejstykke.navn"]);
  const houseNo = pick(obj, ["husnr", "adgangsadresse.husnr"]);
  const floor = pick(obj, ["etage"]);
  const door = pick(obj, ["dør", "dor"]);
  const postcode = pick(obj, ["postnummer.nr", "adgangsadresse.postnummer.nr"]);
  const city = pick(obj, ["postnummer.navn", "adgangsadresse.postnummer.navn"]);
  const fallbackText = pick(obj, ["adressebetegnelse", "betegnelse"]);
  const text = fallbackText || composeText({ road, houseNo, floor, door, postcode, city });

  return {
    source: "dawa",
    text,
    id: (obj && obj.id) || null,
    road,
    houseNo,
    floor,
    door,
    postcode,
    city,
    confidence: "parsed",
  };
}

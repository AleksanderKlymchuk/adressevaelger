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
  // Response is wrapped: { status, adresse: { id_lokalid, adressebetegnelse, husnummer: { ... } } }
  let road = pick(obj, [
    "adresse.husnummer.vejnavn",                  // Primary path in actual API response
    "vejnavn",                                    // Direct field (if API structure varies)
    "navngivenvej.navn",                          // Fallback path
    "adgangsadresse.navngivenvej.navn",          // Fallback path
    "navngivenvejpostnummer.navngivenvej.navn",  // Fallback path
  ]);

  let houseNo = pick(obj, [
    "adresse.husnummer.husnummertekst",          // Primary path in actual API response
    "husnummertekst",                            // Direct field (if API structure varies)
    "husnummer",                                  // Fallback field
    "husnr",                                      // Fallback field
    "adgangsadresse.husnummer",                  // Fallback path
    "adgangsadresse.husnr",                      // Fallback path
  ]);

  let floor = pick(obj, [
    "adresse.etagebetegnelse",                   // Primary path in actual API response
    "etage",                                      // Fallback field
    "adresse.etage",                             // Fallback path
  ]);

  let door = pick(obj, [
    "adresse.doerbetegnelse",                    // Primary path in actual API response
    "dør",                                        // Fallback field
    "dor",                                        // Fallback field
    "adresse.dør",                               // Fallback path
    "adresse.dor",                               // Fallback path
  ]);

  let postcode = pick(obj, [
    "adresse.husnummer.postnummer.postnr",       // Primary path in actual API response
    "postnummer",                                 // Direct field (if API structure varies)
    "postnummer.nr",                             // Fallback nested path
    "navngivenvejpostnummer.postnummer.nr",      // Fallback path
    "postnr",                                     // Fallback field
  ]);

  let city = pick(obj, [
    "adresse.husnummer.postnummer.navn",         // Primary path in actual API response
    "postdistrikt",                              // Direct field (if API structure varies)
    "postnummer.navn",                           // Fallback nested path
    "navngivenvejpostnummer.postnummer.navn",    // Fallback path
    "postnrnavn",                                 // Fallback field
  ]);

  // Authoritative text field from lookup response
  const fallbackText = pick(obj, [
    "adresse.adressebetegnelse",                 // Primary path in actual API response
    "adgangsadressebetegnelse",                  // Fallback field
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
    "adresse.id_lokalid",                        // Primary path in actual API response
    "id_lokalid",                                // Direct field (if API structure varies)
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
  // Extract from actual DAWA lookup response structure (authoritative)
  // Most fields are nested under adgangsadresse; top-level fields: etage, dør, id, adressebetegnelse
  const road = pick(obj, [
    "adgangsadresse.vejstykke.navn",              // Primary path in actual API response
    "vejstykke.navn",                             // Fallback path
  ]);

  const houseNo = pick(obj, [
    "adgangsadresse.husnr",                       // Primary path in actual API response
    "husnr",                                      // Fallback path
  ]);

  const floor = pick(obj, [
    "etage",                                      // Top-level field (primary in actual API response)
    "adgangsadresse.etage",                       // Fallback nested path
  ]);

  const door = pick(obj, [
    "dør",                                        // Top-level field (primary in actual API response)
    "dor",                                        // Alternate top-level field
    "adgangsadresse.dør",                         // Fallback nested path
    "adgangsadresse.dor",                         // Alternate fallback nested path
  ]);

  const postcode = pick(obj, [
    "adgangsadresse.postnummer.nr",               // Primary path in actual API response
    "postnummer.nr",                              // Fallback path
  ]);

  const city = pick(obj, [
    "adgangsadresse.postnummer.navn",             // Primary path in actual API response
    "postnummer.navn",                            // Fallback path
  ]);

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
    confidence: road || postcode ? "lookup" : "unknown",
  };
}

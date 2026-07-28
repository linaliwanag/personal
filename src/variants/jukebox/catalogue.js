// Selection codes. A real jukebox addresses its records as a letter bank and a
// number within the bank -- A1, A2, B1 -- and the keypad is two presses, not
// one. That's the whole reason the codes live here instead of being an index
// formatted at the point of use: the keypad, the title strips, the record
// labels and the status display all have to agree on the same name for the same
// record, and the mapping has to survive records.jsx growing a fourth entry.

export const BANK_SIZE = 2; // records per letter bank

const LETTERS = "ABCDEFGH".split("");

export const codeFor = (index) =>
  `${LETTERS[Math.floor(index / BANK_SIZE)] ?? "?"}${(index % BANK_SIZE) + 1}`;

// One entry per record, in magazine order. `slot` is deliberately the same as
// the array index -- the ring is stocked in catalogue order, so a code lookup
// and a carousel position are the same number.
export const buildCatalogue = (records) =>
  records.map((record, index) => ({ record, slot: index, code: codeFor(index) }));

// The keys the pad shows. Only banks that contain at least one record get a
// letter, so the machine can't offer a whole row of dead buttons -- but the
// last bank may still be half empty (three records means B2 doesn't exist), and
// that combination is a legitimate "no selection" the pad has to answer for.
export const keypadLayout = (count) => ({
  letters: LETTERS.slice(0, Math.max(1, Math.ceil(count / BANK_SIZE))),
  numbers: Array.from({ length: BANK_SIZE }, (_, i) => i + 1),
});

export const findByCode = (catalogue, code) =>
  catalogue.find((entry) => entry.code === code) ?? null;

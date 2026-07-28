import React from "react";

// The shop-counter trivia a real used sleeve carries: what it was priced at,
// which divider it was filed behind, the catalogue number on the spine. Keyed
// by record id with a fallback, so an unfamiliar record still gets a sleeve
// rather than leaving a hole in the crate.
const META = {
  about: {
    genre: "Singer / Songwriter",
    price: "$4",
    catalog: "LW-001",
    year: "2019",
    press: "First press · VG+",
    note: "Sleeve has light ring wear. Plays clean.",
  },
  projects: {
    genre: "Bossa / Breaks",
    price: "$7",
    catalog: "LW-002",
    year: "2021",
    press: "Reissue · NM",
    note: "Two inserts included. Corner bump.",
  },
  contact: {
    genre: "Soul 45s",
    price: "$3",
    catalog: "LW-003",
    year: "2023",
    press: "Promo · VG",
    note: "Shop stamp on back. Not for resale.",
  },
};

const FALLBACK_META = {
  genre: "Misc",
  price: "$5",
  catalog: "LW-000",
  year: "—",
  press: "VG",
  note: "Unfiled.",
};

export const metaFor = (record) => (record && META[record.id]) || FALLBACK_META;

// The cover. `record.color` is the artwork -- everything else is print, wear
// and shop stickers laid over it.
export const SleeveArt = ({ record }) => {
  const meta = metaFor(record);
  return (
    <div className="crate-art" style={{ background: record.color }}>
      <span className="crate-art-wash" aria-hidden="true" />
      <span className="crate-art-ring" aria-hidden="true" />
      <span className="crate-art-spine" aria-hidden="true" />
      <span className="crate-art-scuff" aria-hidden="true" />

      <div className="crate-art-type">
        <span className="crate-art-imprint">Liwanag Recordings</span>
        <span className="crate-art-title">{record.title}</span>
        <span className="crate-art-side">A-side · {record.trackLabel}</span>
      </div>

      <span className="crate-art-cat" aria-hidden="true">{meta.catalog}</span>
      <span className="crate-art-stamp" aria-hidden="true">Used</span>
      <span className="crate-art-price" aria-hidden="true">{meta.price}</span>
    </div>
  );
};

// There was a LinerNotes face here -- the printed back of the sleeve, with the
// record's own `body` dropped in as the notes. Crate Digger turned a pulled
// sleeve over to show it. Studio Crate reads the notes in the deck's liner
// panel instead, so nothing turns over any more and it went with that variant.
// It is in git if the sleeve back is ever wanted again.

// Padding for the crate: sleeves nobody can pull, plus the hand-written card
// dividers they were filed behind. Purely scenery -- see buildCrate in dig.js
// for why none of it is focusable.
export const FillerArt = ({ tone, label }) => (
  <div className="crate-art crate-art--filler" style={{ background: tone }}>
    <span className="crate-art-wash" aria-hidden="true" />
    <span className="crate-art-ring" aria-hidden="true" />
    <span className="crate-art-spine" aria-hidden="true" />
    <span className="crate-art-filler-type">{label}</span>
  </div>
);

export const DividerArt = ({ label }) => (
  <div className="crate-divider">
    <span className="crate-divider-tab">{label}</span>
  </div>
);

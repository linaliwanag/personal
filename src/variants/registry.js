import { lazy } from "react";

// Every UI variant of the site is one entry here. A variant owns the entire
// stage -- the heading, the record menu, the player, and the content panel --
// so a variant can rearrange the page as freely as it likes rather than being
// a skin bolted onto a fixed layout.
//
// Variants are lazy so a variant nobody selects costs nothing to load, and a
// variant that fails to compile can't take the rest of the site down with it.
//
// The props every Stage receives are documented in ./stageProps.js.
// Studio Crate leads because it is the site's real face now; the rest are kept
// as alternates behind the switcher.
export const variants = [
  {
    id: "studiocrate",
    name: "Studio Crate",
    tagline: "The studio deck, with a crate to dig through",
    Stage: lazy(() => import("./studiocrate")),
  },
  {
    id: "classic",
    name: "Classic",
    tagline: "The original flat turntable",
    Stage: lazy(() => import("./classic")),
  },
  {
    id: "studio",
    name: "Studio Deck",
    tagline: "Angled pro deck, draggable tonearm",
    Stage: lazy(() => import("./studio")),
  },
  {
    id: "crate",
    name: "Crate Digger",
    tagline: "Flip through a 3D record crate",
    Stage: lazy(() => import("./crate")),
  },
  {
    id: "orbit",
    name: "Neon Orbit",
    tagline: "Synthwave records orbiting in space",
    Stage: lazy(() => import("./orbit")),
  },
  {
    id: "jukebox",
    name: "Jukebox",
    tagline: "Chrome cabinet with a loading arm",
    Stage: lazy(() => import("./jukebox")),
  },
];

export const DEFAULT_VARIANT_ID = "studiocrate";

export const findVariant = (id) =>
  variants.find((v) => v.id === id) ?? variants.find((v) => v.id === DEFAULT_VARIANT_ID);

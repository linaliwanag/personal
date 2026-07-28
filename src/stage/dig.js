// The crate's geometry and contents, with no React in sight.
//
// This lives apart from the component because two variants dig through the same
// crate: Crate Digger, where the crate is the whole page, and Studio Crate,
// where it sits beside the deck. Both drive the identical scene from the
// identical maths, so a fix to how a sleeve tips is a fix in both.

// A real crate is mostly stuff you don't want. These pad the three real records
// out to something you have to actually dig through, and they are deliberately
// inert -- no pointer events, no tab stop, aria-hidden -- so the keyboard path
// never has to walk past seventeen items to reach three.
const FILLER_POOL = [
  { tone: "linear-gradient(155deg, #55443a, #241c17)", label: "Various Artists\nRare Grooves Vol. 3" },
  { tone: "linear-gradient(155deg, #2f3b46, #161c22)", label: "Night Bus\nLate Transfers" },
  { tone: "linear-gradient(155deg, #4a3550, #1e1626)", label: "Unknown Artist\nWhite Label 12″" },
  { tone: "linear-gradient(155deg, #4d4229, #211c12)", label: "The Cassette Deck\nDemos 82–85" },
  { tone: "linear-gradient(155deg, #33474a, #151f21)", label: "Studio Orchestra\nMusic For Lobbies" },
  { tone: "linear-gradient(155deg, #513a33, #221715)", label: "Ferry Sound System\nDub Plates" },
  { tone: "linear-gradient(155deg, #3b4530, #171c13)", label: "Field Recordings\nRain On Metal" },
  { tone: "linear-gradient(155deg, #47323f, #1d141a)", label: "Soft Focus\nB-Sides & Rarities" },
  { tone: "linear-gradient(155deg, #2c3a52, #131924)", label: "Test Pressing\nDo Not Play" },
  { tone: "linear-gradient(155deg, #4e4a3c, #1f1d17)", label: "Library Music\nVolume Seven" },
];

const DIVIDER_LABELS = ["A – F", "G – M", "N – S", "T – Z"];

// Interleaves dividers and filler around the real records. Derived from
// `records` rather than hand-written, so a fourth record dropped into
// records.jsx gets filed properly instead of appearing at the end of the crate.
export const buildCrate = (records) => {
  const items = [];
  let f = 0;
  const filler = () => {
    const pick = FILLER_POOL[f % FILLER_POOL.length];
    items.push({ key: `filler-${f}`, kind: "filler", tone: pick.tone, label: pick.label });
    f += 1;
  };

  records.forEach((record, i) => {
    items.push({
      key: `divider-${i}`,
      kind: "divider",
      label: DIVIDER_LABELS[i % DIVIDER_LABELS.length],
    });
    filler();
    filler();
    items.push({ key: `record-${record.id}`, kind: "record", record });
    filler();
  });

  items.push({ key: "divider-end", kind: "divider", label: "Misc" });
  filler();
  filler();
  return items;
};

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const smoothstep = (t) => t * t * (3 - 2 * t);

// How far back a sleeve is still drawn, and how far forward a flipped-past one
// stays visible. Everything outside is culled -- except record sleeves, which
// stay mounted at all times so a focused one can never be unmounted out from
// under the keyboard.
export const CULL_BACK = 15;
// Only about three tipped sleeves are ever worth drawing. Any more and the pile
// in front of the crate stops reading as "records leaning forward" and starts
// reading as loose card lying around the scene.
export const CULL_FRONT = 3.5;

// The one geometry function. `d` is index - position: 0 is the sleeve you are
// touching, positive is deeper in the crate, negative has been pushed past.
// Both branches agree at d === 0, which is what lets a drag scrub continuously
// through the hand-off instead of snapping.
export const poseFor = (d) => {
  if (d <= 0) {
    const past = -d;
    // The first step of the tip is eased; every step after it adds only a
    // couple more degrees, so the pile fans slightly instead of collapsing.
    const e = smoothstep(Math.min(past, 1));
    const extra = Math.min(Math.max(past - 1, 0), 2.5);

    // Two constraints fight here and both have to be satisfied.
    //
    // Tip too little and the sleeve stays upright in front of the record you
    // are actually looking at, hiding it. Tip too far (the original 72deg) and
    // the sleeve lies nearly edge-on to the camera: its top edge swings way out
    // past the front lip, perspective magnifies that near edge, and it renders
    // as a huge sheet of card sprawling past the left wall and below the floor.
    //
    // The resolution is to slide the hinge *backwards* as the sleeve tips.
    // That is what really happens when a record flops forward in a crate -- the
    // bottom edge skids back while the top comes toward you -- and it keeps the
    // top edge inside the box (see the z arithmetic below) while still getting
    // the sleeve down out of the sightline.
    const tilt = 48 * e + 5 * extra;

    return {
      transform:
        // z: hinge retreats ~55px, so top edge lands at -55 + sh*sin(48deg),
        // i.e. just inside the front lip rather than 100px proud of it.
        `translate3d(${-4 * e - 3 * extra}px, ${16 * e + 7 * extra}px, ${-55 * e - 12 * extra}px)` +
        ` rotateX(${-tilt}deg)` +
        ` rotateZ(${-1.5 + 2.5 * e + 0.6 * extra}deg)`,
      // Gone by ~3.2 steps past, inside CULL_FRONT.
      opacity: clamp(1 - Math.max(past - 1.8, 0) / 1.4, 0, 1),
      brightness: 1 + 0.08 * e,
    };
  }

  // Standing in the crate. The first eight sleeves get real spacing; anything
  // behind them compresses, so a deep crate reads as deep without pushing the
  // back of the stack out through the far wall. The totals matter: 8*20 + 7*6
  // = 202px, which has to stay inside the box depth set in crate.css.
  const near = Math.min(d, 8);
  const far = Math.max(d - 8, 0);

  return {
    transform:
      `translate3d(${near * 2.3 + far * 0.8}px, ${-near * 1.7 - far * 0.5}px, ${-(near * 20 + far * 6)}px)` +
      ` rotateY(${-Math.min(d, 8) * 0.8}deg)` +
      ` rotateZ(${-1.5 - Math.min(d, 6) * 0.35}deg)`,
    opacity: clamp(1 - Math.max(d - 11.5, 0) / 3, 0, 1),
    brightness: Math.max(1 - Math.min(d, 12) * 0.072, 0.22),
  };
};

// Read once. A media query in CSS can turn transitions off, but it can't stop
// us handing WAAPI a 620ms flight, so the flag has to exist in JS too.
export const reduceMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

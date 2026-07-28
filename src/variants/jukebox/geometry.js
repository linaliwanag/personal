// The inside of the cabinet is modelled in "window space": unrotated pixels on
// the plane of the glass, origin at the window's top-left corner, with +Z
// pointing out through the glass at the reader. Every fixture -- the record
// magazine, the deck, the gripper's rail -- is placed in those coordinates, and
// the cabinet's 3D tilt is applied once, to the cabinet as a whole.
//
// The gripper's stations are *derived* from the fixtures rather than typed in,
// and that is the whole trick behind the mechanism looking real. When the claw
// is at RING_IN it is, by construction, holding a disc at exactly the spot the
// magazine presents one at; when it is at DECK_IN the disc it holds is exactly
// on the spindle. So handing a disc from the magazine to the claw (or from the
// claw to the platter) is a swap of which element is rendered, with nothing
// moving on screen. Get these numbers out of sync and the record teleports a
// few pixels at every hand-off, which is the tell that ruins the illusion.

export const WINDOW = { w: 560, h: 320 };

// The cabinet's fixed layout box. The stage scales this whole thing to fit the
// viewport, so these are design pixels, not CSS pixels on the reader's screen.
export const CABINET = { w: 620 };

// The gantry rail runs across the top of the window. x0/x1 are the ends of the
// visible rail; the carriage never travels outside them.
export const RAIL = { y: 26, x0: 74, x1: 494 };

// The record magazine: a vertical carousel of discs standing on a turning ring,
// seen slightly from above. `fins` are the empty dividers of the rack -- they
// exist so a machine holding three records still reads as a stocked magazine
// without inventing records that aren't there.
export const RING = { cx: 372, cy: 172, r: 108, fins: 12 };

// A Seeburg-style jukebox plays the record standing on edge, and so does this
// one: the deck is a vertical platter. It also spares the mechanism a
// vertical-to-horizontal flip it has no room to perform.
export const DECK = { x: 146, y: 180, z: 26, platterR: 52 };

export const DISC_R = 62;

// The claw closes on the disc's rim, so its jaws sit this far above the disc's
// top edge -- i.e. DISC_R + JAW_GAP above the disc's centre.
export const JAW_GAP = 16;

// Base lengths for the two struts. Both are drawn at these sizes and then
// scaled, so extending the boom or the shaft is a transform rather than a
// layout change -- worth it because they resize on every frame of a move.
export const BOOM_BASE = 100;
export const SHAFT_BASE = 100;

// How far the claw has to reach down from the rail to hold a disc centred at
// `centreY`. Every "down" station comes from this, never from a literal.
const dropFor = (centreY) => centreY - DISC_R - JAW_GAP - RAIL.y;

// Where the gripper can be. x/z are the carriage's position in window space,
// `drop` is how far the shaft has telescoped below the rail.
export const STATIONS = {
  // Parked at the right-hand end of the rail, clear of both fixtures.
  PARK: { x: RAIL.x1 - 8, z: 0, drop: 42 },
  // Above the magazine, arm retracted -- the pose the ring turns underneath.
  RING_UP: { x: RING.cx, z: RING.r, drop: 42 },
  // Down in the rack, jaws level with the front record's rim.
  RING_IN: { x: RING.cx, z: RING.r, drop: dropFor(RING.cy) },
  // Withdrawn towards the glass and lifted clear of the rack, so the disc can
  // travel across without scraping the records still in the magazine.
  RING_OUT: { x: RING.cx, z: RING.r + 82, drop: dropFor(RING.cy) - 26 },
  // Above the deck, still forward of it.
  DECK_UP: { x: DECK.x, z: DECK.z + 82, drop: 42 },
  // Disc seated on the spindle.
  DECK_IN: { x: DECK.x, z: DECK.z, drop: dropFor(DECK.y) },
};

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Records are spread evenly around the ring but snapped onto fin positions, so
// a record always sits *in* a rack slot rather than floating between two.
export const slotAngle = (index, count) => {
  if (count <= 0) return 0;
  const fin = Math.round((index * RING.fins) / count) % RING.fins;
  return (fin * 360) / RING.fins;
};

// A slot faces the reader when the ring has turned by the negative of its own
// angle -- that is the rotation the carousel indexes to.
export const ringDegForSlot = (index, count) => -slotAngle(index, count);

// Rings wrap; angles do not. Turning from slot 2 back to slot 0 should be a
// short nudge, not a 240-degree unwind, so the ring keeps an unbounded running
// angle and every move takes the short way round from wherever it actually is.
export const shortestTurn = (currentDeg, targetDeg) => {
  const delta = ((((targetDeg - currentDeg) % 360) + 540) % 360) - 180;
  return currentDeg + delta;
};

// The tonearm on the vertical deck. It is drawn from the pivot along +X and
// rotated, so the angles below are absolute CSS rotations: degrees, clockwise,
// y pointing down.
export const ARM = {
  x: DECK.x + 112,
  y: DECK.y - 92,
  length: 128,
  park: 96, // sitting on its cradle, well clear of the record
  leadInR: DISC_R, // outer groove
  runOutR: 26, // inner groove -- where the side ends
};

const DEG = 180 / Math.PI;
const PIVOT_TO_SPINDLE = Math.hypot(DECK.x - ARM.x, DECK.y - ARM.y);
const SPINDLE_BEARING = Math.atan2(DECK.y - ARM.y, DECK.x - ARM.x) * DEG;

// Law of cosines: the stylus sits where the arm's swing circle crosses the
// groove circle. Worth solving properly rather than lerping an angle -- a
// pivoted arm's tip traces an arc, so a linear sweep would walk the stylus back
// *outwards* past the halfway mark instead of tracking in towards the label.
export const angleForRadius = (r) => {
  const cosA = clamp(
    (ARM.length ** 2 + PIVOT_TO_SPINDLE ** 2 - r ** 2) /
      (2 * ARM.length * PIVOT_TO_SPINDLE),
    -1,
    1
  );
  return SPINDLE_BEARING - Math.acos(cosA) * DEG;
};

// Position along the track is linear in groove radius, not in arm angle, so the
// fraction interpolates the radius and the angle falls out of that.
export const armAngle = (onDeck, fraction) => {
  if (!onDeck) return ARM.park;
  const r = ARM.leadInR + clamp(fraction, 0, 1) * (ARM.runOutR - ARM.leadInR);
  return angleForRadius(r);
};

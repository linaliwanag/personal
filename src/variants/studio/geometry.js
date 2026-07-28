// The deck is modelled in "plinth space": unrotated pixels on the plinth's top
// face, origin at its rear-left corner. Every fixture -- platter, tonearm pivot,
// pitch fader -- is placed in those coordinates, and the 3D rotation is applied
// once to the whole plinth. That keeps the layout numbers readable and, more
// importantly, gives the drag handlers a flat plane to think in: a pointer
// position is projected back into plinth space before any maths happens.

export const PLINTH = { w: 580, h: 430, thickness: 54 };

export const PLATTER = { x: 200, y: 214, r: 152 };
export const DISC_R = 130;
export const SLIPMAT_R = 134;
export const STROBE_R = 143;

export const PIVOT = { x: 476, y: 74 };
export const ARM_LENGTH = 262;
export const LEAD_IN_R = 122; // outer groove -- where the stylus drops
export const RUNOUT_R = 54;   // inner groove -- where the side ends
export const PARK_ANGLE = 108; // arm sitting on its rest, clear of the record

export const FADER = { x: 512, y0: 236, y1: 376 };
export const PITCH_RANGE = 8; // percent, each way

const DEG = 180 / Math.PI;
const PIVOT_TO_SPINDLE = Math.hypot(PLATTER.x - PIVOT.x, PLATTER.y - PIVOT.y);
const BASE_ANGLE = Math.atan2(PLATTER.y - PIVOT.y, PLATTER.x - PIVOT.x) * DEG;

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Law of cosines, both directions: the stylus sits where the arm's swing circle
// crosses the groove circle. Angles come out the way CSS rotate() wants them --
// degrees, clockwise, y pointing down -- so the result drops straight into a
// transform with no sign juggling.
export const angleForRadius = (r) => {
  const cosA = clamp(
    (ARM_LENGTH ** 2 + PIVOT_TO_SPINDLE ** 2 - r ** 2) /
      (2 * ARM_LENGTH * PIVOT_TO_SPINDLE),
    -1,
    1
  );
  return BASE_ANGLE - Math.acos(cosA) * DEG;
};

export const radiusForAngle = (angle) => {
  const alpha = (BASE_ANGLE - angle) / DEG;
  return Math.sqrt(
    ARM_LENGTH ** 2 +
      PIVOT_TO_SPINDLE ** 2 -
      2 * ARM_LENGTH * PIVOT_TO_SPINDLE * Math.cos(alpha)
  );
};

export const LEAD_IN_ANGLE = angleForRadius(LEAD_IN_R);
export const RUNOUT_ANGLE = angleForRadius(RUNOUT_R);

export const angleForFraction = (f) =>
  LEAD_IN_ANGLE + clamp(f, 0, 1) * (RUNOUT_ANGLE - LEAD_IN_ANGLE);

// Not the inverse of angleForFraction by simple algebra -- position in the track
// is linear in *groove radius*, not in arm angle, which is why this goes back
// through radiusForAngle rather than lerping the angle.
export const fractionForAngle = (angle) => {
  const r = radiusForAngle(clamp(angle, LEAD_IN_ANGLE, RUNOUT_ANGLE));
  return clamp((LEAD_IN_R - r) / (LEAD_IN_R - RUNOUT_R), 0, 1);
};

// The span between the three probe elements, in plinth pixels. Big enough that
// sub-pixel rounding in getBoundingClientRect doesn't skew the basis.
export const PROBE_SPAN = 300;

// Three zero-sized probes pinned to known points on the top face give us the
// plinth plane's exact on-screen basis -- whatever the scene's current parallax
// tilt, scroll offset and responsive scale happen to be. Inverting that 2x2
// turns a client coordinate back into plinth space, which is the only space in
// which "what angle is the tonearm at" is a meaningful question.
//
// Built fresh at pointerdown rather than kept live: the basis only changes when
// the scene moves, and the scene is deliberately frozen for the duration of a
// control drag.
export const makeProjector = (originEl, xEl, yEl) => {
  if (!originEl || !xEl || !yEl) return null;

  const o = originEl.getBoundingClientRect();
  const px = xEl.getBoundingClientRect();
  const py = yEl.getBoundingClientRect();

  const ux = { x: px.left - o.left, y: px.top - o.top };
  const uy = { x: py.left - o.left, y: py.top - o.top };
  const det = ux.x * uy.y - ux.y * uy.x;
  if (!det) return null;

  return (clientX, clientY) => {
    const dx = clientX - o.left;
    const dy = clientY - o.top;
    return {
      x: ((dx * uy.y - dy * uy.x) / det) * PROBE_SPAN,
      y: ((ux.x * dy - ux.y * dx) / det) * PROBE_SPAN,
    };
  };
};

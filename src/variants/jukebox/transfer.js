import { useCallback, useEffect, useRef, useState } from "react";

import { ringDegForSlot, shortestTurn } from "./geometry";

// The transfer mechanism, as a plan of timed steps. Named transfer.js rather
// than mechanism.js because Mechanism.jsx renders it, and on a case-insensitive
// filesystem those two are the same module specifier.
//
// Two rules shape everything here.
//
// 1. A step is a *destination*, not a keyframe path. Each step names a station
//    for the gripper and a duration, and the DOM moves there with a CSS
//    transition of exactly that duration. That is what makes the machine
//    interruptible: retarget it halfway through a carry and the transition
//    simply re-aims from wherever the claw currently is. There is no keyframe
//    timeline to be halfway through and no pose the arm can be stranded in.
//
// 2. The plan is rebuilt from the machine's *physical state*, never from what
//    the reader asked for. If the claw is holding a disc, the plan starts by
//    putting that disc back. If a disc is on the deck, the plan starts by
//    collecting it. Only then does it go and fetch the new one. So the second
//    selection during a sequence neither queues behind it nor stomps it -- the
//    machine finishes being a machine, re-racks what it has, and goes again.
//
// None of this touches audio. The reader's tap has already called onTapLoad
// synchronously and the track is already playing; the mechanism is the picture
// catching up with the sound, and it is allowed to take its time.

const SERVO = "cubic-bezier(0.42, 0, 0.22, 1)"; // long travel, motor-driven
const GLIDE = "cubic-bezier(0.33, 0, 0.15, 1)"; // gentle approach onto a fixture
const SNAP = "cubic-bezier(0.2, 0.85, 0.3, 1)"; // solenoid: jaws, latch

// `disc` is where the record physically is during the step -- "ring" (still in
// the magazine), "claw" (being carried), "deck" (on the platter), or null (this
// record isn't in the machine's hands at all). The mechanism's whole notion of
// state is read back off these, which is why the hand-off steps (grip, release,
// loose) are their own short beats rather than being folded into the moves.

const FETCH = [
  { id: "index", ms: 440, at: "RING_UP", claw: "open", disc: "ring", ease: SERVO, label: "SCANNING" },
  { id: "reach", ms: 360, at: "RING_IN", claw: "open", disc: "ring", ease: GLIDE, label: "SELECTING" },
  { id: "grip", ms: 180, at: "RING_IN", claw: "shut", disc: "ring", ease: SNAP, label: "SELECTING" },
  { id: "pull", ms: 360, at: "RING_OUT", claw: "shut", disc: "claw", ease: GLIDE, label: "TRANSFER" },
  { id: "carry", ms: 520, at: "DECK_UP", claw: "shut", disc: "claw", ease: SERVO, label: "TRANSFER" },
  { id: "lower", ms: 320, at: "DECK_IN", claw: "shut", disc: "claw", ease: GLIDE, label: "CUEING" },
  { id: "release", ms: 180, at: "DECK_IN", claw: "open", disc: "deck", ease: SNAP, label: "CUEING" },
  { id: "park", ms: 420, at: "PARK", claw: "open", disc: "deck", ease: SERVO, label: "PLAYING" },
];

// Everything from `carry` onward: used when the claw is already holding the
// record the reader wants, so a re-tap mid-transfer resumes the delivery
// instead of pointlessly re-racking and fetching the same disc again.
const DELIVER = FETCH.slice(4);

// The return leg runs quicker than the fetch throughout. The machine is putting
// something away rather than finding it, and the reader has already seen this
// trip once -- the second viewing does not need the same ceremony.
const COLLECT = [
  { id: "dive", ms: 340, at: "DECK_UP", claw: "open", disc: "deck", ease: SERVO, label: "RETURNING" },
  { id: "settle", ms: 240, at: "DECK_IN", claw: "open", disc: "deck", ease: GLIDE, label: "RETURNING" },
  { id: "clamp", ms: 160, at: "DECK_IN", claw: "shut", disc: "claw", ease: SNAP, label: "RETURNING" },
  { id: "hoist", ms: 280, at: "DECK_UP", claw: "shut", disc: "claw", ease: GLIDE, label: "RETURNING" },
];

// Putting a carried record back in its rack slot. Split from COLLECT because a
// plan can need only this half -- interrupt a fetch mid-carry and the disc is
// already in the claw with nothing to collect.
const RESTOCK = [
  { id: "ferry", ms: 420, at: "RING_OUT", claw: "shut", disc: "claw", ease: SERVO, label: "RETURNING" },
  { id: "stow", ms: 300, at: "RING_IN", claw: "shut", disc: "claw", ease: GLIDE, label: "FILING" },
  { id: "loose", ms: 160, at: "RING_IN", claw: "open", disc: "ring", ease: SNAP, label: "FILING" },
  { id: "rest", ms: 340, at: "PARK", claw: "open", disc: null, ease: SERVO, label: "READY" },
];

// Not part of any transfer: the move that gets the arm out of the fixtures when
// a plan ends with nothing to carry. Ejecting while the record is still in the
// rack -- entirely possible, the audio starts long before the claw arrives --
// would otherwise leave the arm standing in the magazine with no plan to bring
// it home, which is precisely the stuck state this module exists to prevent.
const GO_HOME = [
  { id: "home", ms: 380, at: "PARK", claw: "open", disc: null, ease: SERVO, label: "READY" },
];

// The machine at rest with an empty magazine bay and nothing selected.
export const IDLE_STEP = {
  id: "idle",
  ms: 0,
  at: "PARK",
  claw: "open",
  disc: null,
  ease: SERVO,
  label: "READY",
  entry: null,
};

// A step only means something attached to a record, because the ring has to
// know which slot to present and the view has to know which disc to draw.
const bind = (steps, entry) => steps.map((step) => ({ ...step, entry }));

export const heldBy = (step) => (step.disc === "claw" ? step.entry : null);
export const deckedBy = (step) => (step.disc === "deck" ? step.entry : null);

// `state` is simply the last step the machine executed -- there is no separate
// bookkeeping to fall out of sync with it.
export const buildPlan = (state, target) => {
  const held = heldBy(state);
  const decked = deckedBy(state);
  const targetId = target?.record.id ?? null;

  // A restock that is about to be followed by a fetch drops its final trip back
  // to the parking spot -- a real changer doesn't go home between two jobs, it
  // files the old record and turns straight round for the new one.
  const restock = target ? RESTOCK.slice(0, -1) : RESTOCK;

  if (held) {
    if (held.record.id === targetId) return bind(DELIVER, held);
    return [...bind(restock, held), ...(target ? bind(FETCH, target) : [])];
  }

  if (decked) {
    if (decked.record.id === targetId) return []; // already where it belongs
    return [
      ...bind(COLLECT, decked),
      ...bind(restock, decked),
      ...(target ? bind(FETCH, target) : []),
    ];
  }

  return target ? bind(FETCH, target) : bind(GO_HOME, null);
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Under reduced motion the mechanism still *happens* -- the machine would be
// incoherent if the disc teleported -- it just happens at a pace that reads as
// a state change rather than as motion. The same number is handed to the CSS
// transition, so every move still finishes exactly on its step boundary.
const REDUCED_MS = 90;

export function useMechanism(records) {
  const [step, setStep] = useState(IDLE_STEP);
  const [ringDeg, setRingDeg] = useState(0);

  // The plan driver deliberately keeps its own copy of everything it reads.
  // React state lags a tick behind a timer callback, and a plan built from a
  // stale pose is exactly how an arm ends up somewhere impossible.
  const stateRef = useRef(IDLE_STEP);
  const ringDegRef = useRef(0);
  const tokenRef = useRef(0);
  const timerRef = useRef(null);
  const countRef = useRef(records.length);
  countRef.current = records.length;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const retarget = useCallback((target, onDone) => {
    // Bumping the token orphans every timer and completion callback from the
    // previous plan in one move. Nothing from the old plan can fire again, so a
    // superseded eject can never clear a record the reader has just chosen.
    const token = ++tokenRef.current;
    clearTimeout(timerRef.current);

    const plan = buildPlan(stateRef.current, target);
    const reduced = prefersReducedMotion();
    let index = 0;

    const advance = () => {
      if (tokenRef.current !== token) return;

      if (index >= plan.length) {
        onDone?.();
        return;
      }

      const next = plan[index++];
      const ms = reduced ? REDUCED_MS : next.ms;
      // The step carries the duration the view transitions with, so a step's
      // motion is guaranteed to land on its own boundary rather than drifting
      // against a duration written down separately in the stylesheet.
      const timed = { ...next, ms };

      if (timed.entry) {
        ringDegRef.current = shortestTurn(
          ringDegRef.current,
          ringDegForSlot(timed.entry.slot, countRef.current)
        );
        setRingDeg(ringDegRef.current);
      }

      stateRef.current = timed;
      setStep(timed);
      timerRef.current = setTimeout(advance, ms);
    };

    advance();
  }, []);

  return { step, ringDeg, retarget };
}

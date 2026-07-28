import React from "react";

import {
  ARM,
  DECK,
  DISC_R,
  JAW_GAP,
  RAIL,
  RING,
  STATIONS,
  WINDOW,
  BOOM_BASE,
  SHAFT_BASE,
  armAngle,
  slotAngle,
} from "./geometry";
import { deckedBy, heldBy } from "./transfer";

// Everything behind the glass. This component is pure: it draws the machine in
// whatever pose the current step names and knows nothing about timing. All the
// motion comes from CSS transitions whose duration is the step's own duration,
// handed down as --jb-ms -- which is why an interrupted plan looks like a
// machine changing its mind rather than a broken animation.

const Disc = ({ entry, className = "", style }) => (
  <div
    className={`jb-disc ${className}`}
    style={{ background: entry.record.color, ...style }}
  >
    <div className="jb-disc-shine" />
    <div className="jb-disc-label">
      <span className="jb-disc-code">{entry.code}</span>
      <span className="jb-disc-title">{entry.record.title}</span>
    </div>
  </div>
);

// A slot is reachable by finger only while it is turned towards the reader. The
// two records around the back of the carousel are still drawn -- that's the
// point of a carousel -- but they must not swallow a tap aimed at the disc in
// front of them, and there is no honest way to "click" a record you are looking
// at the back of. The keypad and the title strips reach those.
const FACING_LIMIT = 135;

const isFacing = (ringDeg, angle) => {
  const facing = (((ringDeg + angle) % 360) + 540) % 360 - 180;
  return Math.abs(facing) <= FACING_LIMIT;
};

const Mechanism = ({ catalogue, step, ringDeg, isPlaying, progress, onPick }) => {
  const station = STATIONS[step.at];
  const carried = heldBy(step);
  const decked = deckedBy(step);

  // Exactly one record can be out of the magazine at a time, and this is it.
  // Its rack slot shows an empty bracket until it comes home.
  const outId = (carried ?? decked)?.record.id ?? null;

  const jaw = step.claw === "shut" ? 3 : 15;

  return (
    <div className="jb-window">
      <div
        className="jb-void"
        style={{
          "--jb-w": `${WINDOW.w}px`,
          "--jb-h": `${WINDOW.h}px`,
          "--jb-disc": `${DISC_R * 2}px`,
          "--jb-ms": `${step.ms}ms`,
          "--jb-ease": step.ease,
        }}
      >
        <div className="jb-backwall" />
        <div className="jb-floor" />

        {/* The deck. A jukebox plays its records standing on edge, which is
            both what a Seeburg actually does and the reason the gripper never
            has to flip a disc from vertical to flat inside a 320px window. */}
        <div
          className="jb-deck"
          style={{ left: `${DECK.x}px`, top: `${DECK.y}px`, transform: `translateZ(${DECK.z}px)` }}
        >
          <div className="jb-platter" style={{ "--jb-platter": `${DECK.platterR * 2}px` }} />
          {decked && (
            <Disc
              entry={decked}
              className={`jb-disc--deck ${isPlaying ? "is-spinning" : ""}`}
            />
          )}
          <div className="jb-spindle" />
        </div>

        {/* Drawn after the deck so it sits over the record, and pushed a hair
            further forward in Z so the stylus reads as touching the surface. */}
        <div
          className="jb-tonearm"
          style={{ left: `${ARM.x}px`, top: `${ARM.y}px`, transform: `translateZ(${DECK.z + 10}px)` }}
        >
          <div className="jb-arm-post" />
          <div
            className="jb-arm-tube"
            style={{
              width: `${ARM.length}px`,
              transform: `rotate(${armAngle(!!decked, progress / 100)}deg)`,
            }}
          >
            <div className="jb-arm-head" />
          </div>
        </div>

        {/* The magazine. Records are stocked in catalogue order, so the slot a
            record lives in and the code that addresses it are the same number. */}
        <div className="jb-rack" style={{ left: `${RING.cx}px`, top: `${RING.cy}px` }}>
          <div className="jb-ring" style={{ transform: `rotateY(${ringDeg}deg)` }}>
            <div
              className="jb-ring-plate jb-ring-plate--floor"
              style={{ "--jb-ring-d": `${(RING.r + 22) * 2}px`, "--jb-plate-y": `${DISC_R + 10}px` }}
            />
            <div
              className="jb-ring-plate jb-ring-plate--roof"
              style={{ "--jb-ring-d": `${(RING.r + 22) * 2}px`, "--jb-plate-y": `${-DISC_R - 10}px` }}
            />

            {/* Rack dividers, sat half a slot off the records so a record is
                always between two fins rather than inside one. */}
            {Array.from({ length: RING.fins }, (_, i) => (
              <div
                key={`fin-${i}`}
                className="jb-fin"
                style={{
                  transform: `rotateY(${((i + 0.5) * 360) / RING.fins}deg) translateZ(${RING.r}px) rotateY(90deg)`,
                }}
              />
            ))}

            {catalogue.map((entry) => {
              const angle = slotAngle(entry.slot, catalogue.length);
              const out = entry.record.id === outId;
              const facing = isFacing(ringDeg, angle);
              return (
                <div
                  key={entry.record.id}
                  className="jb-slot"
                  style={{ transform: `rotateY(${angle}deg) translateZ(${RING.r}px)` }}
                >
                  <div className={`jb-slot-bracket ${out ? "is-empty" : ""}`} />
                  {!out && (
                    <button
                      type="button"
                      className="jb-slot-btn"
                      tabIndex={facing ? 0 : -1}
                      aria-hidden={!facing}
                      style={{ pointerEvents: facing ? "auto" : "none" }}
                      // Straight through to the Stage's select(), which calls
                      // onTapLoad inside this very handler. Nothing about the
                      // mechanism gets to defer that.
                      onClick={(event) => onPick(entry, event)}
                    >
                      <Disc entry={entry} />
                      <span className="jb-sr">
                        Play {entry.record.title}, selection {entry.code}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* The gantry: a rail across the top, a boom that telescopes towards the
            glass, a shaft that drops, and a claw. Four separate degrees of
            freedom, each one a transform, so the reader can read what the
            machine is doing at any frozen moment. */}
        <div
          className="jb-rail"
          style={{ left: `${RAIL.x0}px`, top: `${RAIL.y}px`, width: `${RAIL.x1 - RAIL.x0}px` }}
        />
        <div
          className="jb-gantry"
          style={{ top: `${RAIL.y}px`, transform: `translateX(${station.x}px)` }}
        >
          <div
            className="jb-boom"
            style={{
              width: `${BOOM_BASE}px`,
              transform: `rotateY(-90deg) scaleX(${station.z / BOOM_BASE})`,
            }}
          />
          <div className="jb-column" style={{ transform: `translateZ(${station.z}px)` }}>
            <div
              className="jb-shaft"
              style={{ height: `${SHAFT_BASE}px`, transform: `scaleY(${station.drop / SHAFT_BASE})` }}
            />
            <div className="jb-head" style={{ transform: `translateY(${station.drop}px)` }}>
              {/* Disc before jaws: they are coplanar inside the head, so paint
                  order is what decides whether the claw is gripping the record
                  or hiding behind it. */}
              {carried && (
                <Disc
                  entry={carried}
                  className="jb-disc--carried"
                  style={{ top: `${JAW_GAP}px` }}
                />
              )}
              <div className="jb-jaw jb-jaw--l" style={{ transform: `translateX(${-jaw}px)` }} />
              <div className="jb-jaw jb-jaw--r" style={{ transform: `translateX(${jaw}px)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Outside .jb-void, not inside it: the glass is painted over the
          interior instead of standing in front of it in Z. A record pulled out
          of the rack ends up within a few pixels of the pane, and a pane placed
          in front of *that* would project oversized and spill past the bezel. */}
      <div className="jb-glass" />
    </div>
  );
};

export default Mechanism;

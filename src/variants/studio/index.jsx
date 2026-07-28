import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faEject, faStop } from "@fortawesome/free-solid-svg-icons";

import { formatTime } from "../../audio/useTurntableAudio";
import Deck from "./Deck";
import { PITCH_RANGE } from "./geometry";
import "./studio.css";

// The record travels between the rack and the platter inside the scene's own 3D
// space rather than as a fixed overlay measured in viewport pixels: both ends
// are already in the same preserve-3d frame, so the disc genuinely arcs up out
// of the rack and settles onto the platter with the right foreshortening, and
// there is nothing to re-measure if the page scrolls mid-flight.
const FLIGHT_IN_MS = 640;
const FLIGHT_OUT_MS = 520;
const REDUCED_FLIGHT_MS = 140;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// How high the record rides above the platter mount when it is simply sitting
// there. Deck.jsx puts it there with an inline `translateZ(platterTopZ + 4)`,
// and every keyframe below has to carry the same lift: an animation *replaces*
// the transform property outright, so a keyframe written at z 0 would drop the
// disc a full 25px on the way down -- under the platter face (z 21) and the
// slipmat (z 23), which swallow it for the last stretch of the flight before it
// pops back up. No amount of CSS could correct that from the outside; the
// offset is only present at rest, so any constant added to compensate would be
// present during the flight too.
// KEEP IN STEP with Deck.jsx: (PLATTER_SLICES - 1) * SLICE_STEP + 4.
const DISC_REST_Z = 25;

// Where the disc comes from, in platter-local pixels: up, back and off to the
// left, which is where the rack sits in the scene. Z is measured from the
// platter mount, hence DISC_REST_Z as the floor rather than 0.
const OFF_PLATTER = `translate3d(-300px, -150px, ${DISC_REST_Z + 210}px) rotateZ(-26deg) scale(0.46)`;
const OVERSHOOT = `translate3d(-26px, -12px, ${DISC_REST_Z + 46}px) rotateZ(-5deg) scale(1.05)`;
const ON_PLATTER = `translate3d(0px, 0px, ${DISC_REST_Z}px) rotateZ(0deg) scale(1)`;

const Sleeve = ({ record, index, isLoaded, onPick }) => {
  const ref = useRef(null);

  // The rule that outranks everything else here: onTapLoad has to run inside the
  // real gesture, on this tick. The lift-out animation is played by the deck
  // *around* the state change, never before it.
  const pick = (event) => {
    if (isLoaded) return;
    const rect = ref.current?.getBoundingClientRect();
    onPick(
      record,
      rect
        ? { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, width: rect.width }
        : undefined
    );
    event.currentTarget.blur?.();
  };

  return (
    <div
      ref={ref}
      className={`studio-sleeve${isLoaded ? " is-out" : ""}`}
      style={{ "--sleeve-i": index }}
      role="button"
      tabIndex={0}
      aria-label={`Load ${record.title}`}
      aria-pressed={isLoaded}
      onClick={pick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        pick(event);
      }}
    >
      <span className="studio-sleeve-disc" />
      <span className="studio-sleeve-face" style={{ background: record.color }}>
        <span className="studio-sleeve-grain" />
        <span className="studio-sleeve-kicker">SIDE {String.fromCharCode(65 + index)}</span>
        <span className="studio-sleeve-title">{record.title}</span>
        <span className="studio-sleeve-track">{record.trackLabel}</span>
        <span className="studio-sleeve-hole" />
      </span>
      <span className="studio-sleeve-edge" />
    </div>
  );
};

// The deck's own record store: three sleeves filed in a shallow wooden rack.
// Pulled out into a component because it is one of two things that can sit in
// this slot -- Studio Crate hands in the full crate from ../crate instead.
const Rack = ({ records, loadedId, onPick }) => (
  <div className="studio-rack">
    <span className="studio-rack-floor" />
    <span className="studio-rack-back" />
    <span className="studio-rack-lip" />
    <div className="studio-rack-slots">
      {records.map((r, i) => (
        <Sleeve
          key={r.id}
          record={r}
          index={i}
          isLoaded={loadedId === r.id}
          onPick={onPick}
        />
      ))}
    </div>
    <span className="studio-rack-label">CRATE&nbsp;/&nbsp;A–C</span>
  </div>
);

// `picker` swaps out whatever sits beside the deck and feeds it records; `copy`
// swaps the idle liner-notes text that describes how to use it. Everything else
// -- the deck, the arm, the flights, the transport -- is shared, which is the
// whole point: Studio Crate is this stage with a different record store, not a
// second copy of it.
export const StudioStage = ({
  records,
  loaded,
  onTapLoad,
  onEject,
  onEjectStart,
  audio,
  isCoarsePointer,
  picker,
  copy,
}) => {
  const record = loaded?.record ?? null;

  const rootRef = useRef(null);
  const sceneRef = useRef(null);
  const discRef = useRef(null);
  const ejectTimerRef = useRef(null);
  const ejectingRef = useRef(false);
  const interactingRef = useRef(false);
  const resumeRef = useRef(false);

  const [ejecting, setEjecting] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [rpm, setRpm] = useState(33);
  const [armUp, setArmUp] = useState(false);

  const reduced = useMemo(prefersReducedMotion, []);

  // --- arrival ---------------------------------------------------------------

  useLayoutEffect(() => {
    if (!loaded) {
      ejectingRef.current = false;
      setEjecting(false);
      setArmUp(false);
      return;
    }

    const el = discRef.current;
    if (!el) return;

    if (reduced) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FLIGHT_MS });
      return;
    }

    el.animate(
      [
        { transform: OFF_PLATTER, opacity: 0, easing: "cubic-bezier(0.32, 0, 0.3, 1)" },
        // Drops a shade past the platter before settling, so the record reads as
        // something with weight being set down rather than a sprite arriving.
        { offset: 0.7, transform: OVERSHOOT, opacity: 1, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        { transform: ON_PLATTER, opacity: 1 },
      ],
      { duration: FLIGHT_IN_MS }
    );
  }, [loaded, reduced]);

  // --- eject -----------------------------------------------------------------

  const finishEject = useCallback(() => {
    if (!ejectingRef.current) return;
    ejectingRef.current = false;
    clearTimeout(ejectTimerRef.current);
    ejectTimerRef.current = null;
    onEject();
  }, [onEject]);

  const ejectRecord = useCallback(() => {
    if (!record || ejectingRef.current) return;
    ejectingRef.current = true;
    setEjecting(true);
    // Sound goes with the gesture; the picture has a flight left to finish.
    onEjectStart();

    const el = discRef.current;
    const duration = reduced ? REDUCED_FLIGHT_MS : FLIGHT_OUT_MS;
    if (!el) {
      finishEject();
      return;
    }

    const flight = el.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { transform: ON_PLATTER, opacity: 1, easing: "cubic-bezier(0.4, 0, 0.5, 1)" },
            { offset: 0.24, transform: OVERSHOOT, opacity: 1, easing: "cubic-bezier(0.5, 0, 0.7, 1)" },
            { transform: OFF_PLATTER, opacity: 0 },
          ],
      { duration, fill: "forwards" }
    );

    // Belt and braces, same as the classic deck: onfinish is delivered on a
    // frame tick, so a throttled or backgrounded tab can leave the record parked
    // in mid-air. The timer lands it on schedule and finishEject is idempotent.
    flight.onfinish = finishEject;
    ejectTimerRef.current = setTimeout(finishEject, duration + 40);
  }, [record, reduced, onEjectStart, finishEject]);

  useEffect(() => () => clearTimeout(ejectTimerRef.current), []);

  // --- cueing ----------------------------------------------------------------

  const liftArm = useCallback(() => {
    resumeRef.current = audio.isPlaying;
    if (audio.isPlaying) audio.toggle();
    setArmUp(true);
  }, [audio]);

  const lowerArm = useCallback(() => {
    setArmUp(false);
    if (resumeRef.current && !audio.isPlaying) audio.toggle();
    resumeRef.current = false;
  }, [audio]);

  // --- scene parallax --------------------------------------------------------

  const setInteracting = useCallback((value) => {
    interactingRef.current = value;
  }, []);

  useEffect(() => {
    if (isCoarsePointer || reduced) return undefined;
    const root = rootRef.current;
    const scene = sceneRef.current;
    if (!root || !scene) return undefined;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const loop = () => {
      raf = 0;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      scene.style.setProperty("--studio-lean-x", `${(currentX * 4).toFixed(3)}deg`);
      scene.style.setProperty("--studio-lean-y", `${(currentY * 6).toFixed(3)}deg`);
      if (Math.abs(targetX - currentX) > 0.0015 || Math.abs(targetY - currentY) > 0.0015) {
        raf = requestAnimationFrame(loop);
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (event) => {
      // Frozen while a control is being dragged: the tonearm and fader project
      // the pointer through the scene's current transform, and a scene that
      // tilted in response to that same pointer would chase its own tail.
      if (interactingRef.current) return;
      const rect = root.getBoundingClientRect();
      targetX = ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 2;
      targetY = ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 2;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [isCoarsePointer, reduced]);

  // --- dust ------------------------------------------------------------------

  // Fixed pseudo-random field rather than Math.random(): the motes keep their
  // places across re-renders, so nothing twitches when the pitch fader moves.
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 37.4) % 96}%`,
        top: `${(i * 61.7) % 88}%`,
        size: 1 + ((i * 7) % 3),
        delay: `${-(i * 1.9) % 18}s`,
        duration: `${16 + ((i * 5) % 13)}s`,
      })),
    []
  );

  const total = formatTime(100, audio.duration);
  const elapsed = formatTime(audio.progress, audio.duration);

  return (
    <div className="studio-root" ref={rootRef}>
      <div className="studio-room" aria-hidden="true">
        <span className="studio-beam" />
        <span className="studio-floor" />
        <div className={`studio-dust${reduced ? " is-still" : ""}`}>
          {motes.map((m, i) => (
            <span
              key={i}
              style={{
                left: m.left,
                top: m.top,
                width: m.size,
                height: m.size,
                animationDelay: m.delay,
                animationDuration: m.duration,
              }}
            />
          ))}
        </div>
      </div>

      <div className="studio-shell">
        <header className="studio-head">
          <p className="studio-eyebrow">Listening room &middot; take one</p>
          <h1 className="studio-name">
            Paulina<span>Liwanag</span>
          </h1>
          <p className="studio-role">
            Software engineer at LogicGate. Backend by trade, front-of-house by choice.
          </p>
        </header>

        <div className="studio-body">
          <div className="studio-viewport">
            <div className="studio-stage">
              <div className="studio-scene" ref={sceneRef}>
                {picker ?? (
                  <Rack records={records} loadedId={record?.id ?? null} onPick={onTapLoad} />
                )}

                <Deck
                  record={record}
                  audio={audio}
                  discRef={discRef}
                  ejecting={ejecting}
                  pitch={pitch}
                  onPitch={setPitch}
                  rpm={rpm}
                  onRpm={setRpm}
                  armUp={armUp}
                  onLift={liftArm}
                  onLower={lowerArm}
                  onEject={ejectRecord}
                  onInteract={setInteracting}
                  reduced={reduced}
                />
              </div>
            </div>
          </div>

          <aside className="studio-liner">
            <div className="studio-liner-head">
              <span className="studio-liner-kicker">Liner notes</span>
              <h2>{record ? record.title : "Nothing cued"}</h2>
              <p className="studio-liner-track">
                {record
                  ? record.trackLabel
                  : copy?.hint ?? "Pick a sleeve out of the rack to start a side."}
              </p>
            </div>

            <dl className="studio-spec">
              <div>
                <dt>Speed</dt>
                <dd>{rpm === 45 ? "45" : "33⅓"} rpm</dd>
              </div>
              <div>
                <dt>Pitch</dt>
                <dd className={Math.abs(pitch) < 0.06 ? "is-locked" : ""}>
                  {pitch > 0 ? "+" : ""}
                  {pitch.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt>Arm</dt>
                <dd>{!record ? "Parked" : armUp ? "Cued up" : "On groove"}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{audio.isPlaying ? "Running" : record ? "Standby" : "Idle"}</dd>
              </div>
            </dl>

            <div className="studio-transport">
              <div className="studio-transport-keys">
                <button
                  type="button"
                  className={`studio-tkey${audio.isPlaying ? " is-on" : ""}`}
                  onClick={audio.toggle}
                  disabled={!record}
                >
                  <FontAwesomeIcon icon={audio.isPlaying ? faPause : faPlay} />
                  <span>{audio.isPlaying ? "Pause" : "Play"}</span>
                </button>
                <button
                  type="button"
                  className="studio-tkey"
                  onClick={audio.stop}
                  disabled={!record}
                >
                  <FontAwesomeIcon icon={faStop} />
                  <span>Stop</span>
                </button>
                <button
                  type="button"
                  className="studio-tkey"
                  onClick={ejectRecord}
                  disabled={!record || ejecting}
                >
                  <FontAwesomeIcon icon={faEject} />
                  <span>Eject</span>
                </button>
              </div>

              <div className="studio-meter">
                <span
                  className="studio-meter-fill"
                  style={{ transform: `scaleX(${(audio.progress / 100).toFixed(4)})` }}
                />
              </div>
              <div className="studio-times">
                <span>{elapsed}</span>
                <span className="studio-times-hint">
                  {record ? "drag the headshell to scrub" : ` `}
                </span>
                <span>{total}</span>
              </div>
            </div>

            <div className="studio-liner-body">
              {record
                ? record.body
                : copy?.body ?? (
                    <div>
                      <p>
                        Three sides sit in the rack: who I am, what I&rsquo;ve built, and how to
                        reach me. Lift one out and the deck cues it up.
                      </p>
                      <p>
                        The arm is live &mdash; grab the headshell and swing it across the record
                        to scrub. The fader pulls the platter off speed, and the strobe dots
                        around the rim drift the moment it leaves 0.0.
                      </p>
                    </div>
                  )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// Studio Deck itself: the stage with its own rack, no overrides.
const Stage = (props) => <StudioStage {...props} />;

export default Stage;

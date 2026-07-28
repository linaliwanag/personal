import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Keypad from "./Keypad";
import Mechanism from "./Mechanism";
import Transport from "./Transport";
import { buildCatalogue } from "./catalogue";
import { CABINET } from "./geometry";
import { useMechanism } from "./transfer";
import "./jukebox.css";

// Jukebox: a 1950s selector cabinet with the lid off, so to speak. The records
// live in a carousel behind glass and a gripper fetches the one you choose --
// travels to it, grips it, pulls it out of the rack, carries it across and
// lowers it onto a vertical deck. That transfer is the variant; everything else
// on the cabinet exists to frame it.
//
// The one thing worth knowing before editing: the audio does not wait for the
// mechanism. Selecting a record calls onTapLoad synchronously inside the click
// handler and the track starts at once, three seconds before the claw gets
// there. That is not an oversight -- iOS only unlocks an audio element inside a
// genuine gesture, so deferring the call until the arm lands would give a phone
// a beautiful silent machine.

const BUBBLES = 7;
const FLASH_MS = 1600;

// How far the reader's pointer tilts the cabinet, in degrees. Small on purpose:
// this is a heavy lacquered box, not a hovering panel, and the transport's
// scrub maths assumes the tilt stays close to nothing.
const TILT_X = 4;
const TILT_Y = 6;
const REST_TILT_X = 5;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const JukeboxStage = ({
  records,
  loaded,
  onTapLoad,
  onEject,
  onEjectStart,
  audio,
  isCoarsePointer,
}) => {
  const catalogue = useMemo(() => buildCatalogue(records), [records]);
  const byId = useMemo(
    () => new Map(catalogue.map((entry) => [entry.record.id, entry])),
    [catalogue]
  );

  const { step, ringDeg, retarget } = useMechanism(records);

  const [letter, setLetter] = useState(() => catalogue[0]?.code[0] ?? "A");
  const [flash, setFlash] = useState(null);
  const flashTimerRef = useRef(null);

  // What the mechanism has been *told* to go and get. Compared against `loaded`
  // rather than derived from it, so the effect below can tell a genuine change
  // of selection from a re-render.
  const plannedRef = useRef(null);
  // The ref is the guard -- it has to be readable and writable in the same tick
  // as the click. The state exists only so the button can grey itself out; they
  // are always set together.
  const ejectingRef = useRef(false);
  const [ejecting, setEjecting] = useState(false);

  const loadedRecord = loaded?.record ?? null;
  const loadedEntry = loadedRecord ? byId.get(loadedRecord.id) ?? null : null;

  const announce = useCallback((text) => {
    setFlash(text);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  // The single place the mechanism is aimed. Whatever changed `loaded` -- a ring
  // disc, a title strip, the keypad -- the machine finds out here, one step
  // removed from the gesture, because by then the audio has already started and
  // the arm's only job is to catch up.
  useEffect(() => {
    const target = loadedRecord ? byId.get(loadedRecord.id) ?? null : null;
    if ((target?.record.id ?? null) === (plannedRef.current?.record.id ?? null)) return;
    plannedRef.current = target;
    // A selection landing mid-eject supersedes it: retarget orphans the eject's
    // completion callback, so onEject can no longer fire and clear the record
    // the reader has just chosen.
    ejectingRef.current = false;
    setEjecting(false);
    retarget(target);
  }, [loadedRecord, byId, retarget]);

  // onTapLoad, called inside the reader's own click. Every pickable thing on the
  // cabinet funnels through here for exactly that reason.
  const select = useCallback(
    (entry, event) => {
      // Re-picking the record that is already on -- or already on its way back
      // -- is a no-op App would swallow anyway (it dedupes by id), so say so
      // rather than letting the reader tap into silence. During an eject that
      // matters: the audio is already gone and the record is about to unmount.
      if (loadedRecord?.id === entry.record.id) {
        announce(ejectingRef.current ? "RETURNING — PLEASE WAIT" : "ALREADY ON THE DECK");
        return;
      }
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const fromRect = rect
        ? { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, width: rect.width }
        : undefined;
      setLetter(entry.code[0]);
      onTapLoad(entry.record, fromRect);
    },
    [announce, loadedRecord, onTapLoad]
  );

  const eject = useCallback(() => {
    if (!loadedRecord || ejectingRef.current) return;
    ejectingRef.current = true;
    setEjecting(true);
    plannedRef.current = null;
    // Sound dies with the gesture; the record is still in the machine and has a
    // whole trip home ahead of it.
    onEjectStart();
    // ...and onEject only once the gripper has actually re-racked it, which is
    // what this callback is: the last step of the return plan finishing.
    retarget(null, () => {
      ejectingRef.current = false;
      setEjecting(false);
      onEject();
    });
  }, [loadedRecord, onEject, onEjectStart, retarget]);

  // --- Cabinet fitting -------------------------------------------------------
  // The cabinet is laid out at a fixed 620px width because a 3D scene with a
  // perspective origin, a rail and a carousel cannot be reflowed -- its parts
  // are positioned against each other, not against the viewport. So it is built
  // at its design size and scaled to fit, and the wrapper is given the scaled
  // height so the page below it doesn't sit under a gap.
  const fitRef = useRef(null);
  const cabinetRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  // Layout effect, so the cabinet is measured and scaled before the first paint
  // rather than flashing at full size for a frame on a phone.
  useLayoutEffect(() => {
    const fitEl = fitRef.current;
    const cabinetEl = cabinetRef.current;
    if (!fitEl || !cabinetEl) return;

    const measure = () => {
      const width = fitEl.clientWidth;
      // ResizeObserver reports layout boxes, which transforms don't touch, so
      // this stays the cabinet's unscaled height however small it is drawn --
      // otherwise scaling down would shrink the measurement, which would shrink
      // the scale, and the two would chase each other to zero.
      const natural = cabinetEl.offsetHeight;
      if (!width || !natural) return;
      const scale = Math.min(1, width / CABINET.w);
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.001 && Math.abs(prev.height - natural * scale) < 1
          ? prev
          : { scale, height: natural * scale }
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(fitEl);
    observer.observe(cabinetEl);
    measure();
    return () => observer.disconnect();
  }, []);

  // --- Parallax --------------------------------------------------------------
  // Written straight to the element rather than through state: the cabinet's
  // subtree is several hundred nodes and re-rendering it on every pointermove
  // would make the mechanism stutter for the sake of a 4-degree tilt.
  const tiltRef = useRef(null);
  const handleTilt = useCallback(
    (event) => {
      const el = tiltRef.current;
      if (!el || isCoarsePointer || prefersReducedMotion()) return;
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `rotateX(${REST_TILT_X - ny * TILT_X}deg) rotateY(${nx * TILT_Y}deg)`;
    },
    [isCoarsePointer]
  );
  const resetTilt = useCallback(() => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }, []);

  // --- Status display --------------------------------------------------------
  const statusText = flash
    ? flash
    : loadedEntry && (step.id === "park" || step.id === "idle")
      ? loadedEntry.record.trackLabel
      : step.entry
        ? `${step.label} · ${step.entry.code}`
        : loadedEntry
          ? step.label
          : "SELECT A TITLE";

  // Coarse pointers only: the panel sits below the fold on a phone, and by the
  // time the arm has finished the reader has watched the machine and wants the
  // words. Desktop already has both on screen.
  const panelRef = useRef(null);
  useEffect(() => {
    if (!isCoarsePointer || step.id !== "park" || !loadedRecord) return;
    const timer = setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 200);
    return () => clearTimeout(timer);
  }, [isCoarsePointer, step.id, loadedRecord]);

  return (
    <div className="jb-stage">
      <header className="jb-masthead">
        <h1>Hi there, I&apos;m Paulina!</h1>
        <p>
          Punch in a selection and watch the machine go and get it — the arm pulls your
          record out of the rack and lowers it onto the deck.
        </p>
      </header>

      <div
        className="jb-fit"
        ref={fitRef}
        style={fit.height ? { height: `${fit.height}px` } : undefined}
      >
        <div
          className="jb-scale"
          style={{ width: `${CABINET.w}px`, transform: `scale(${fit.scale})` }}
        >
          <div className="jb-scene" onPointerMove={handleTilt} onPointerLeave={resetTilt}>
            <div className="jb-cabinet" ref={cabinetRef}>
              <div className="jb-tilt" ref={tiltRef}>
                {/* Side walls, rotated back from the front face's edges. The
                    cabinet is a box, not a poster, and the flanks are what sell
                    that the moment the reader tilts it. */}
                <div className="jb-flank jb-flank--l" />
                <div className="jb-flank jb-flank--r" />

                <div className="jb-front">
                  <div className="jb-crown">
                    <div className="jb-crown-glow" />
                    <div className="jb-marquee">
                      <span className="jb-marquee-name">Liwanag</span>
                      <span className="jb-marquee-sub">Select&#8209;O&#8209;Matic</span>
                    </div>
                    <div className="jb-tube jb-tube--l">
                      {Array.from({ length: BUBBLES }, (_, i) => (
                        <span
                          key={i}
                          className="jb-bubble"
                          style={{ animationDelay: `${(i * 0.73).toFixed(2)}s` }}
                        />
                      ))}
                    </div>
                    <div className="jb-tube jb-tube--r">
                      {Array.from({ length: BUBBLES }, (_, i) => (
                        <span
                          key={i}
                          className="jb-bubble"
                          style={{ animationDelay: `${(i * 0.61 + 0.4).toFixed(2)}s` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="jb-display">
                    <span className="jb-display-code">{loadedEntry?.code ?? "--"}</span>
                    <span className="jb-display-text">{statusText}</span>
                    <span className={`jb-lamp ${audio.isPlaying ? "is-lit" : ""}`} />
                  </div>

                  <Mechanism
                    catalogue={catalogue}
                    step={step}
                    ringDeg={ringDeg}
                    isPlaying={audio.isPlaying}
                    progress={audio.progress}
                    onPick={select}
                  />

                  <div className="jb-console">
                    <div className="jb-strips">
                      {catalogue.map((entry) => (
                        <button
                          key={entry.record.id}
                          type="button"
                          className={`jb-strip ${
                            entry.record.id === loadedRecord?.id ? "is-playing" : ""
                          }`}
                          onClick={(event) => select(entry, event)}
                        >
                          <span className="jb-strip-code">{entry.code}</span>
                          <span className="jb-strip-text">
                            <strong>{entry.record.title}</strong>
                            <em>{entry.record.trackLabel}</em>
                          </span>
                          <span
                            className="jb-strip-swatch"
                            style={{ background: entry.record.color }}
                          />
                        </button>
                      ))}
                    </div>

                    <Keypad
                      catalogue={catalogue}
                      letter={letter}
                      onLetter={setLetter}
                      onSelect={select}
                      onMiss={(code) => announce(`${code} — NO SELECTION`)}
                      loadedId={loadedRecord?.id ?? null}
                    />
                  </div>

                  <Transport
                    audio={audio}
                    record={loadedRecord}
                    onEject={eject}
                    busy={ejecting}
                  />

                  <div className="jb-grille" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The cabinet has nowhere honest to put prose, so the prose gets its own
          lit panel underneath, at full page width and native size. Theme purity
          is not worth an unreadable About section. */}
      <section className="jb-panel" ref={panelRef}>
        {loadedRecord ? (
          <>
            <header className="jb-panel-head">
              <span className="jb-panel-code">{loadedEntry?.code}</span>
              <h2>{loadedRecord.title}</h2>
              <span className="jb-panel-track">{loadedRecord.trackLabel}</span>
            </header>
            <div className="jb-prose">{loadedRecord.body}</div>
          </>
        ) : (
          <p className="jb-panel-idle">
            Nothing on the deck. Pick a selection above and this panel lights up with it.
          </p>
        )}
      </section>
    </div>
  );
};

export default JukeboxStage;

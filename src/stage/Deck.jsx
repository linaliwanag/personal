import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faEject } from "@fortawesome/free-solid-svg-icons";

import {
  PLINTH,
  PLATTER,
  DISC_R,
  SLIPMAT_R,
  STROBE_R,
  PIVOT,
  ARM_LENGTH,
  PARK_ANGLE,
  LEAD_IN_ANGLE,
  RUNOUT_ANGLE,
  FADER,
  PITCH_RANGE,
  REV_SECONDS_AT_BASE,
  platterRate,
  angleForFraction,
  fractionForAngle,
  clamp,
  makeProjector,
} from "./deckGeometry";

const DEG = 180 / Math.PI;
const STROBE_DOTS = 44;
const PLATTER_SLICES = 8;   // stacked discs standing in for a turned cylinder
const SLICE_STEP = 3;       // px of translateZ between them

// The strobe ring never changes -- only the animation on its parent does -- so
// it stays out of the render path while the pitch fader is being dragged.
const StrobeRing = React.memo(function StrobeRing() {
  return (
    <>
      {Array.from({ length: STROBE_DOTS }, (_, i) => (
        <span
          key={i}
          className="studio-strobe-dot"
          style={{ transform: `rotate(${(i * 360) / STROBE_DOTS}deg) translateY(${-STROBE_R}px)` }}
        />
      ))}
    </>
  );
});

// A pair of ballistic VU needles. Deliberately a model rather than real
// analysis: fast attack, slow release, three incommensurate sines so the two
// channels never quite agree with each other. Written straight to the DOM from
// rAF -- a needle that re-rendered React sixty times a second would drag the
// whole deck with it.
const useVuNeedles = (isPlaying, reduced) => {
  const needles = useRef([]);
  const peaks = useRef([]);

  useEffect(() => {
    const setNeedle = (i, level) => {
      const needle = needles.current[i];
      if (needle) needle.style.transform = `rotate(${(-44 + level * 88).toFixed(2)}deg)`;
      const peak = peaks.current[i];
      if (peak) peak.style.opacity = level > 0.84 ? "1" : "0";
    };

    if (reduced) {
      setNeedle(0, isPlaying ? 0.5 : 0);
      setNeedle(1, isPlaying ? 0.44 : 0);
      return undefined;
    }

    let raf = 0;
    const level = [0, 0];
    const tick = () => {
      const t = performance.now() / 1000;
      for (let i = 0; i < 2; i += 1) {
        const phase = i * 1.7;
        const drive = isPlaying
          ? 0.54 +
            0.26 * Math.sin(t * 3.1 + phase) +
            0.15 * Math.sin(t * 7.7 + phase * 2.3) +
            0.09 * Math.sin(t * 13.9 + phase * 0.6)
          : 0;
        const target = clamp(drive, 0, 1);
        // Asymmetric ballistics are the whole character of a VU meter: it snaps
        // up to a transient and sags back down slowly.
        level[i] += (target - level[i]) * (target > level[i] ? 0.34 : 0.055);
        setNeedle(i, level[i]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, reduced]);

  return { needles, peaks };
};

const VuMeter = ({ label, needleRef, peakRef }) => (
  <div className="studio-vu">
    <svg className="studio-vu-scale" viewBox="0 0 120 62" aria-hidden="true">
      <path d="M 14 56 A 48 48 0 0 1 106 56" className="studio-vu-arc" />
      <path d="M 62 12 A 48 48 0 0 1 106 56" className="studio-vu-arc studio-vu-arc--hot" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (-44 + (i * 88) / 6) / DEG;
        const r1 = 40;
        const r2 = i > 4 ? 47 : 45;
        return (
          <line
            key={i}
            x1={60 + Math.sin(a) * r1}
            y1={58 - Math.cos(a) * r1}
            x2={60 + Math.sin(a) * r2}
            y2={58 - Math.cos(a) * r2}
            className={i > 4 ? "studio-vu-tick studio-vu-tick--hot" : "studio-vu-tick"}
          />
        );
      })}
    </svg>
    <span className="studio-vu-needle" ref={needleRef} />
    <span className="studio-vu-pivot" />
    <span className="studio-vu-peak" ref={peakRef} />
    <span className="studio-vu-label">{label}</span>
  </div>
);

const Deck = ({
  record,
  audio,
  discRef,
  ejecting,
  pitch,
  onPitch,
  rpm,
  onRpm,
  armUp,
  onLift,
  onLower,
  onEject,
  onInteract,
  reduced,
}) => {
  const isPlaying = audio.isPlaying;

  // Probes for the plinth-plane projection. Zero-sized, so their client rect
  // collapses to exactly the point they sit on.
  const probeO = useRef(null);
  const probeX = useRef(null);
  const probeY = useRef(null);

  const armProjRef = useRef(null);
  const faderProjRef = useRef(null);
  const seekRafRef = useRef(0);
  const pendingSeekRef = useRef(null);

  const [dragAngle, setDragAngle] = useState(null);
  const [faderHeld, setFaderHeld] = useState(false);
  const dragging = dragAngle !== null;

  const { needles, peaks } = useVuNeedles(isPlaying, reduced);

  useEffect(() => () => cancelAnimationFrame(seekRafRef.current), []);

  const projector = useCallback(
    () => makeProjector(probeO.current, probeX.current, probeY.current),
    []
  );

  // ---- tonearm -------------------------------------------------------------

  const armAngle = dragging
    ? dragAngle
    : record
      ? angleForFraction(audio.progress / 100)
      : PARK_ANGLE;

  const beginArmDrag = (event) => {
    const project = projector();
    if (!project) return;
    armProjRef.current = project;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    onInteract(true);
    // Picking the arm up is a cue: on a real deck you lift before you move, and
    // the sound stops with it. onLower() at the end of the drag puts it back.
    onLift();
    setDragAngle(armAngle);
  };

  const moveArmDrag = (event) => {
    const project = armProjRef.current;
    if (!project) return;
    const p = project(event.clientX, event.clientY);
    let a = Math.atan2(p.y - PIVOT.y, p.x - PIVOT.x) * DEG;
    // atan2 wraps at +/-180 well outside the arm's travel; folding the negative
    // half up keeps a pointer flung past the rear of the deck from snapping the
    // arm to the opposite end of the record.
    if (a < -90) a += 360;
    a = clamp(a, LEAD_IN_ANGLE, RUNOUT_ANGLE);
    setDragAngle(a);

    // The arm follows the pointer every frame, but seeking is coalesced: each
    // seek() sets progress state, and firing one per pointermove would re-render
    // the deck ahead of the frame that actually paints it.
    pendingSeekRef.current = fractionForAngle(a);
    if (!seekRafRef.current) {
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = 0;
        if (pendingSeekRef.current !== null) audio.seek(pendingSeekRef.current);
      });
    }
  };

  const endArmDrag = (event) => {
    if (!armProjRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    armProjRef.current = null;
    setDragAngle(null);
    onInteract(false);
    onLower();
  };

  // ---- pitch fader ---------------------------------------------------------

  const pitchT = 0.5 - pitch / (PITCH_RANGE * 2);
  const faderY = FADER.y0 + pitchT * (FADER.y1 - FADER.y0);

  const beginFaderDrag = (event) => {
    const project = projector();
    if (!project) return;
    faderProjRef.current = project;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    setFaderHeld(true);
    onInteract(true);
  };

  const moveFaderDrag = (event) => {
    const project = faderProjRef.current;
    if (!project) return;
    const p = project(event.clientX, event.clientY);
    const t = clamp((p.y - FADER.y0) / (FADER.y1 - FADER.y0), 0, 1);
    onPitch(Math.round((0.5 - t) * 2 * PITCH_RANGE * 20) / 20);
  };

  const endFaderDrag = (event) => {
    if (!faderProjRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    faderProjRef.current = null;
    setFaderHeld(false);
    onInteract(false);
  };

  const faderKeys = (event) => {
    const step = event.shiftKey ? 1 : 0.1;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      onPitch(clamp(Math.round((pitch + step) * 20) / 20, -PITCH_RANGE, PITCH_RANGE));
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      onPitch(clamp(Math.round((pitch - step) * 20) / 20, -PITCH_RANGE, PITCH_RANGE));
    } else if (event.key === "Home") {
      onPitch(0);
    } else {
      return;
    }
    event.preventDefault();
  };

  // ---- platter motion ------------------------------------------------------

  const spinning = isPlaying && !ejecting && !armUp;
  // Same platterRate the audio engine is running at, turned into a revolution
  // period. Reading both off one function is what keeps the disc's rotation
  // honest about the sound now that the speed controls are audible.
  const spinSeconds = REV_SECONDS_AT_BASE / platterRate(rpm, pitch);
  const strobeLocked = Math.abs(pitch) < 0.06;

  const platterSlices = useMemo(
    () =>
      Array.from({ length: PLATTER_SLICES }, (_, i) => (
        <span
          key={i}
          className="studio-platter-slice"
          style={{
            transform: `translateZ(${i * SLICE_STEP}px)`,
            background: `hsl(232 7% ${7 + i * 1.7}%)`,
          }}
        />
      )),
    []
  );

  const platterTopZ = (PLATTER_SLICES - 1) * SLICE_STEP;

  return (
    <div className="studio-deck">
      <div className="studio-contact-shadow" />

      <div className="studio-plinth" style={{ width: PLINTH.w, height: PLINTH.h }}>
        {/* Faces. Each one is a real plane hinged off an edge of the box, so the
            chamfers along the top rim catch the key light and the front skirt
            falls into shadow -- the thing that makes it read as an object with
            mass rather than a picture of one. */}
        <div
          className="studio-face studio-face--front"
          style={{
            width: PLINTH.w,
            height: PLINTH.thickness,
            transform: `translate3d(0, ${PLINTH.h}px, ${PLINTH.thickness}px) rotateX(-90deg)`,
          }}
        >
          <span className="studio-badge">PL&nbsp;&middot;&nbsp;SD-1200</span>
          <span className="studio-badge studio-badge--right">DIRECT DRIVE</span>
        </div>

        <div
          className="studio-face studio-face--side"
          style={{
            width: PLINTH.h,
            height: PLINTH.thickness,
            transform: `translate3d(${PLINTH.w}px, 0, ${PLINTH.thickness}px) rotateX(-90deg) rotateY(-90deg)`,
          }}
        />
        <div
          className="studio-face studio-face--side"
          style={{
            width: PLINTH.h,
            height: PLINTH.thickness,
            transform: `translate3d(0, ${PLINTH.h}px, ${PLINTH.thickness}px) rotateX(-90deg) rotateY(90deg)`,
          }}
        />
        <div
          className="studio-face studio-face--back"
          style={{
            width: PLINTH.w,
            height: PLINTH.thickness,
            transform: `translate3d(0, 0, ${PLINTH.thickness}px) rotateX(-90deg)`,
          }}
        />

        {[
          [34, 34],
          [PLINTH.w - 34, 34],
          [34, PLINTH.h - 34],
          [PLINTH.w - 34, PLINTH.h - 34],
        ].map(([fx, fy]) => (
          <span
            key={`${fx}-${fy}`}
            className="studio-foot"
            style={{ left: fx, top: fy, transform: "translate(-50%, -50%) translateZ(-16px)" }}
          />
        ))}

        <div
          className="studio-face studio-face--top"
          style={{
            width: PLINTH.w,
            height: PLINTH.h,
            transform: `translateZ(${PLINTH.thickness}px)`,
          }}
        >
          <span ref={probeO} className="studio-probe" style={{ left: 0, top: 0 }} />
          <span ref={probeX} className="studio-probe" style={{ left: 300, top: 0 }} />
          <span ref={probeY} className="studio-probe" style={{ left: 0, top: 300 }} />

          {/* Instrument bridge: hinged just inside the rear edge and tipped up,
              so the meters face the reader instead of the ceiling. */}
          <div className="studio-bridge">
            <div className="studio-bridge-panel">
              <VuMeter
                label="L"
                needleRef={(el) => { needles.current[0] = el; }}
                peakRef={(el) => { peaks.current[0] = el; }}
              />
              <div className="studio-bridge-plate">
                <span className="studio-bridge-name">PAULINA LIWANAG</span>
                <span className="studio-bridge-sub">STUDIO&nbsp;DECK&nbsp;/&nbsp;SD-1200</span>
              </div>
              <VuMeter
                label="R"
                needleRef={(el) => { needles.current[1] = el; }}
                peakRef={(el) => { peaks.current[1] = el; }}
              />
            </div>
          </div>

          <div
            className="studio-platter-mount"
            style={{
              left: PLATTER.x - PLATTER.r,
              top: PLATTER.y - PLATTER.r,
              width: PLATTER.r * 2,
              height: PLATTER.r * 2,
            }}
          >
            <span className="studio-platter-well" />
            {platterSlices}

            <div className="studio-platter-face" style={{ transform: `translateZ(${platterTopZ}px)` }}>
              <div
                className="studio-strobe"
                style={{
                  animationDuration: `${Math.min(90, 26 / Math.max(Math.abs(pitch), 0.05)).toFixed(2)}s`,
                  animationDirection: pitch < 0 ? "reverse" : "normal",
                  // Dots only drift while the platter is actually turning, and
                  // lock solid at 0.0% -- which is the point of them.
                  animationPlayState: spinning && !strobeLocked ? "running" : "paused",
                }}
              >
                <StrobeRing />
              </div>

              <span
                className="studio-slipmat"
                style={{ width: SLIPMAT_R * 2, height: SLIPMAT_R * 2 }}
              />
            </div>

            {record && (
              <div
                ref={discRef}
                className="studio-disc-mount"
                style={{
                  transform: `translateZ(${platterTopZ + 4}px)`,
                  width: DISC_R * 2,
                  height: DISC_R * 2,
                }}
              >
                <div
                  className={`studio-disc${spinning ? " is-spinning" : ""}`}
                  style={{ background: record.color, animationDuration: `${spinSeconds.toFixed(3)}s` }}
                >
                  <span className="studio-disc-grooves" />
                  <span className="studio-disc-sheen" />
                  <span className="studio-disc-label">
                    <em>{record.title}</em>
                    <i>{rpm === 45 ? "45" : "33⅓"} RPM</i>
                  </span>
                </div>
              </div>
            )}

            <span
              className="studio-spindle"
              style={{ transform: `translate(-50%, -50%) translateZ(${platterTopZ + 12}px)` }}
            />
          </div>

          {/* Tonearm. The rotor is a zero-sized node at the pivot; everything
              hanging off it is positioned in arm-length units, so one rotate()
              swings the tube, the headshell and the counterweight together. */}
          <div className="studio-arm-mount" style={{ left: PIVOT.x, top: PIVOT.y }}>
            <span className="studio-arm-collar" />
            <span className="studio-arm-post" />
            <div
              className={`studio-arm-rotor${dragging ? " is-dragging" : ""}${armUp ? " is-lifted" : ""}`}
              style={{ transform: `translateZ(52px) rotate(${armAngle.toFixed(3)}deg)` }}
            >
              <svg className="studio-arm-tube" viewBox="-120 -60 420 120" aria-hidden="true">
                <defs>
                  <linearGradient id="studio-arm-metal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0f2f5" />
                    <stop offset="42%" stopColor="#9aa0a8" />
                    <stop offset="100%" stopColor="#3b3f45" />
                  </linearGradient>
                </defs>
                <path
                  className="studio-arm-path"
                  d={`M 0 0 C 54 0 72 -22 118 -26 S 214 -6 ${ARM_LENGTH} 6`}
                  stroke="url(#studio-arm-metal)"
                />
                <path
                  className="studio-arm-gloss"
                  d={`M 0 -2 C 54 -2 72 -24 118 -28 S 214 -8 ${ARM_LENGTH} 4`}
                />
                <rect className="studio-arm-stub" x="-96" y="-6" width="96" height="12" rx="6" />
              </svg>

              <span className="studio-counterweight" />
              <span className="studio-antiskate" />

              <div
                className="studio-headshell"
                style={{ left: ARM_LENGTH }}
                role="slider"
                tabIndex={0}
                aria-label="Tonearm position"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(audio.progress)}
                onPointerDown={beginArmDrag}
                onPointerMove={moveArmDrag}
                onPointerUp={endArmDrag}
                onPointerCancel={endArmDrag}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const delta = event.key === "ArrowRight" ? 0.04 : -0.04;
                  audio.seek(clamp(audio.progress / 100 + delta, 0, 1));
                }}
              >
                <span className="studio-headshell-body" />
                <span className="studio-headshell-finger" />
                <span className="studio-cartridge" />
                <span className="studio-stylus" />
              </div>
            </div>

            {/* The rest is placed where the parked arm's stylus lands, so the
                arm settles onto it instead of near it. */}
            <span
              className="studio-arm-rest"
              style={{
                left: Math.cos(PARK_ANGLE / DEG) * ARM_LENGTH,
                top: Math.sin(PARK_ANGLE / DEG) * ARM_LENGTH,
              }}
            />
          </div>

          {/* Front-panel transport. Small on a phone by design -- the liner
              panel below carries a full-size copy of every control. */}
          <div className="studio-panel">
            <button
              type="button"
              className={`studio-power${isPlaying ? " is-on" : ""}`}
              onClick={audio.toggle}
              disabled={!record}
              aria-label={isPlaying ? "Pause" : "Start"}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              <span className="studio-power-ring" />
            </button>

            <div className="studio-speeds">
              <button
                type="button"
                className={`studio-key${rpm === 33 ? " is-on" : ""}`}
                onClick={() => onRpm(33)}
                aria-pressed={rpm === 33}
              >
                33
              </button>
              <button
                type="button"
                className={`studio-key${rpm === 45 ? " is-on" : ""}`}
                onClick={() => onRpm(45)}
                aria-pressed={rpm === 45}
              >
                45
              </button>
            </div>

            <button
              type="button"
              className={`studio-key studio-key--cue${armUp ? " is-on" : ""}`}
              onClick={() => (armUp ? onLower() : onLift())}
              aria-pressed={armUp}
              disabled={!record}
            >
              CUE
            </button>

            <button
              type="button"
              className="studio-key studio-key--eject"
              onClick={onEject}
              disabled={!record || ejecting}
              aria-label="Eject record"
            >
              <FontAwesomeIcon icon={faEject} />
            </button>
          </div>

          {/* Pitch fader */}
          <div
            className="studio-fader"
            style={{ left: FADER.x, top: FADER.y0 - 18, height: FADER.y1 - FADER.y0 + 36 }}
          >
            <span className="studio-fader-slot" style={{ height: FADER.y1 - FADER.y0 }} />
            <span className="studio-fader-centre" />
            {[-8, -4, 0, 4, 8].map((mark) => (
              <span
                key={mark}
                className={`studio-fader-tick${mark === 0 ? " is-zero" : ""}`}
                style={{ top: 18 + (0.5 - mark / (PITCH_RANGE * 2)) * (FADER.y1 - FADER.y0) }}
              />
            ))}
            <span
              className={`studio-fader-knob${faderHeld ? " is-held" : ""}`}
              style={{ top: 18 + (faderY - FADER.y0) }}
              role="slider"
              tabIndex={0}
              aria-label="Pitch"
              aria-valuemin={-PITCH_RANGE}
              aria-valuemax={PITCH_RANGE}
              aria-valuenow={pitch}
              aria-valuetext={`${pitch > 0 ? "+" : ""}${pitch.toFixed(1)} percent`}
              onPointerDown={beginFaderDrag}
              onPointerMove={moveFaderDrag}
              onPointerUp={endFaderDrag}
              onPointerCancel={endFaderDrag}
              onKeyDown={faderKeys}
            />
            <span className="studio-fader-caption">PITCH ADJ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deck;

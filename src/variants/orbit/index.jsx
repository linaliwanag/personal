import React, { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop, faEject } from "@fortawesome/free-solid-svg-icons";

import { formatTime } from "../../audio/useTurntableAudio";
import "./orbit.css";

// ---------------------------------------------------------------------------
// Scene geometry, in world pixels. Everything below lives inside one
// preserve-3d world under a single camera transform, so these are all measured
// in the same space: +x right, +y DOWN (CSS convention), +z toward the viewer.
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;

const ORBIT_R = 330;        // spindle-to-record distance
const ORBIT_INC = 0.32;     // radians the orbital plane is tipped off horizontal
const ORBIT_SECONDS = 30;   // one full revolution
const RECORD_Y = 58;        // the height the orbit is centred on, and where a record lands
const PLATTER_Y = 78;       // top face of the floating platter
const GRID_Y = 330;         // the neon floor
const SUN_Y = -120;
const SUN_Z = -1500;

const PLATTER_SCALE = 2.0;  // how much bigger a record reads once it's on the deck
const SPIRAL_TURNS = 1.4;   // extra revolutions burned on the way down
const DESCEND_MS = 950;
const ASCEND_MS = 820;
const REDUCED_MS = 200;

const TRAIL_COUNT = 3;
const TRAIL_STEP = 0.11;    // radians between a record and each ghost behind it

const ORBIT_SPIN = 42;      // deg/s a record turns on its own axis out in orbit
const PLAY_SPIN = 118;      // ...and once it's on the platter with the track running

// Camera limits. PITCH_MIN keeps the eye above the grid -- drop below it and you
// see the floor plane edge-on and then from underneath, which reads as a bug.
const PITCH_MIN = 3;
const PITCH_MAX = 58;
const DOLLY_MIN = -700;
const DOLLY_MAX = 360;
const YAW_PER_PX = 0.26;
const PITCH_PER_PX = 0.2;
const DAMP = 0.935;         // per-frame velocity decay after release
const IDLE_DRIFT = 1.4;     // deg/s the camera keeps creeping once inertia is spent

// Magenta / cyan / violet, assigned per record. `record.color` is still used --
// it presses the paper label at the centre of each disc -- but the neon that
// carries the scene is the variant's own.
const ACCENTS = ["#22e6ff", "#ff2fb9", "#a86bff"];
const ACCENT_BY_ID = { about: 0, projects: 1, contact: 2 };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const Stage = ({ records, loaded, onTapLoad, onEject, onEjectStart, audio }) => {
  const record = loaded?.record ?? null;

  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const sunRef = useRef(null);
  const barRef = useRef(null);

  // One slot per record, filled by ref callbacks below. Kept as plain arrays so
  // the animation loop can index them without allocating.
  const satRefs = useRef([]);
  const discRefs = useRef([]);
  const tagRefs = useRef([]);
  const ghostRefs = useRef([]);
  // Per-record descent progress: 0 = out in orbit, 1 = landed on the platter.
  // A single number per record covers every transition, including "swap the
  // loaded record" -- the outgoing one just walks back to 0 while the incoming
  // one walks to 1.
  const uRef = useRef([]);
  const spinRef = useRef([]);

  if (uRef.current.length !== records.length) {
    uRef.current = records.map(() => 0);
    spinRef.current = records.map((_, i) => i * 53);
    satRefs.current = records.map(() => null);
    discRefs.current = records.map(() => null);
    tagRefs.current = records.map(() => null);
    ghostRefs.current = records.map(() => []);
  }

  const camRef = useRef({
    yaw: -24, pitch: 17, dist: 0,
    vYaw: 0, vPitch: 0,
    lift: 0, shift: 0,
  });
  const layoutRef = useRef({ w: 1280, h: 800, scale: 1, compact: false });
  const timeRef = useRef(0);

  const pointersRef = useRef(new Map());
  const dragRef = useRef({ active: false, id: null, x: 0, y: 0, moved: 0 });
  const pinchRef = useRef(null);
  // How far the last completed drag travelled, so a click that was really a
  // camera swing doesn't also load a record.
  const lastMovedRef = useRef(0);
  const seekingRef = useRef(false);

  // Set the moment the eject gesture happens. The record it names keeps its
  // `loaded` status (App still owns it) but is animated back out to orbit;
  // onEject fires only when it gets there.
  const ejectingRef = useRef(null);

  const [flareKey, setFlareKey] = useState(0);
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );

  // Everything the rAF loop needs from React, refreshed every render. The loop
  // itself is created once and never re-reads props directly.
  const stateRef = useRef({
    loaded: null, playing: false, reduced: false, onEject: () => {},
  });
  useEffect(() => {
    stateRef.current = {
      loaded, playing: audio.isPlaying, reduced, onEject,
    };
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A record can be replaced while an eject is still in flight. If that happens
  // the flight is orphaned -- App has already moved on -- so drop the marker,
  // otherwise it would later veto a genuine re-load of the same record.
  useEffect(() => {
    if (!loaded || loaded.record.id !== ejectingRef.current) ejectingRef.current = null;
  }, [loaded]);

  // The whole world is scaled by one uniform scale3d rather than restyled per
  // breakpoint: scaling x, y AND z together is exactly equivalent to pulling the
  // camera back, so the scene stays internally consistent at every width.
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      layoutRef.current = {
        w, h,
        scale: clamp(Math.min(w / 1180, h / 780), 0.44, 1),
        compact: w < 760,
      };
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  // ------------------------------------------------------------------ camera
  const beginDrag = useCallback((e) => {
    const ptrs = pointersRef.current;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinchRef.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        dist0: camRef.current.dist,
      };
      dragRef.current.active = false;
      return;
    }
    if (e.button > 0) return;

    camRef.current.vYaw = 0;
    camRef.current.vPitch = 0;
    dragRef.current = { active: true, id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    viewportRef.current?.classList.add("orbit-grabbing");
  }, []);

  // Move/up live on window rather than behind setPointerCapture: capturing
  // retargets the subsequent click to the capturing element, which would make
  // the orbiting records unclickable. Touch pointers are implicitly captured by
  // their pointerdown target anyway, so both input types still bubble up here.
  useEffect(() => {
    const onMove = (e) => {
      const ptrs = pointersRef.current;
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const cam = camRef.current;
      const pinch = pinchRef.current;
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        cam.dist = clamp(pinch.dist0 + (d - pinch.d0) * 1.7, DOLLY_MIN, DOLLY_MAX);
        return;
      }

      const drag = dragRef.current;
      if (!drag.active || e.pointerId !== drag.id) return;

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);

      const dYaw = dx * YAW_PER_PX;
      const dPitch = -dy * PITCH_PER_PX;
      cam.yaw += dYaw;
      const pitch = clamp(cam.pitch + dPitch, PITCH_MIN, PITCH_MAX);
      // Velocity is a running average of the last few moves, so a jittery final
      // sample can't fling the scene on release.
      cam.vYaw = cam.vYaw * 0.6 + dYaw * 0.4;
      cam.vPitch = pitch === cam.pitch ? 0 : cam.vPitch * 0.6 + dPitch * 0.4;
      cam.pitch = pitch;
    };

    const onUp = (e) => {
      const ptrs = pointersRef.current;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchRef.current = null;

      const drag = dragRef.current;
      if (drag.active && e.pointerId === drag.id) {
        drag.active = false;
        lastMovedRef.current = drag.moved;
        viewportRef.current?.classList.remove("orbit-grabbing");
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Registered by hand so it can be non-passive -- React's onWheel is passive in
  // React 19 and preventDefault there would be ignored.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const cam = camRef.current;
      cam.dist = clamp(cam.dist - e.deltaY * 0.65, DOLLY_MIN, DOLLY_MAX);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ----------------------------------------------------------- the one loop
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const world = worldRef.current;
      if (!world) return;

      const st = stateRef.current;
      const cam = camRef.current;
      const L = layoutRef.current;
      const still = st.reduced;

      if (!dragRef.current.active) {
        if (still) {
          cam.vYaw = 0;
          cam.vPitch = 0;
        } else {
          cam.yaw += cam.vYaw + IDLE_DRIFT * dt;
          const pitch = clamp(cam.pitch + cam.vPitch, PITCH_MIN, PITCH_MAX);
          cam.vPitch = pitch === cam.pitch ? 0 : cam.vPitch * DAMP;
          cam.pitch = pitch;
          cam.vYaw *= DAMP;
          if (Math.abs(cam.vYaw) < 0.002) cam.vYaw = 0;
          if (Math.abs(cam.vPitch) < 0.002) cam.vPitch = 0;
        }
      }
      if (cam.yaw > 360) cam.yaw -= 360;
      else if (cam.yaw < -360) cam.yaw += 360;

      // Framing, not camera orbit: loading a record has to make room for the
      // content panel, which sits bottom-half on narrow screens and right-hand
      // side on wide ones. Eased rather than snapped so the scene glides aside.
      const liftTarget = L.compact
        ? (st.loaded ? -L.h * 0.2 : -L.h * 0.05)
        : (st.loaded ? -L.h * 0.03 : 0);
      const shiftTarget = L.compact ? 0 : (st.loaded ? -L.w * 0.13 : 0);
      const k = Math.min(1, dt * 5);
      cam.lift += (liftTarget - cam.lift) * k;
      cam.shift += (shiftTarget - cam.shift) * k;

      const s = L.scale;
      world.style.transform =
        `translate3d(${cam.shift.toFixed(1)}px, ${cam.lift.toFixed(1)}px, ${cam.dist.toFixed(1)}px)` +
        ` rotateX(${cam.pitch.toFixed(2)}deg) rotateY(${cam.yaw.toFixed(2)}deg)` +
        ` scale3d(${s},${s},${s})`;

      // Exact inverse of the camera's rotation, so anything carrying it faces
      // the viewer while keeping its real position in the world -- which is what
      // lets the records occlude and be occluded by the platter for free.
      const bill = `rotateY(${(-cam.yaw).toFixed(2)}deg) rotateX(${(-cam.pitch).toFixed(2)}deg)`;
      if (sunRef.current) {
        sunRef.current.style.transform = `translate3d(0px, ${SUN_Y}px, ${SUN_Z}px) ${bill}`;
      }

      if (!still) timeRef.current += dt;
      const t = timeRef.current;
      const omega = TAU / ORBIT_SECONDS;
      const turns = still ? 0 : SPIRAL_TURNS;
      const loadedId = st.loaded?.record.id ?? null;

      for (let i = 0; i < records.length; i++) {
        const sat = satRefs.current[i];
        if (!sat) continue;
        const id = records[i].id;

        const target = id === loadedId && ejectingRef.current !== id ? 1 : 0;
        const span = still ? REDUCED_MS : target === 1 ? DESCEND_MS : ASCEND_MS;
        const step = (dt * 1000) / span;
        const was = uRef.current[i];
        const u = target > was ? Math.min(target, was + step) : Math.max(target, was - step);
        uRef.current[i] = u;

        if (was < 1 && u >= 1) setFlareKey((n) => n + 1);
        if (was > 0 && u <= 0 && ejectingRef.current === id) {
          ejectingRef.current = null;
          st.onEject();
        }

        const eu = easeInOut(u);
        // Radius collapsing to zero is what turns the orbit into the spiral:
        // the record keeps circling while it is reeled in, and the plane's tilt
        // (which is proportional to radius) flattens out on the way.
        const ang = i * (TAU / records.length) + t * omega + turns * TAU * eu;
        const r = ORBIT_R * (1 - eu);
        const cx = r * Math.cos(ang);
        const cz = r * Math.sin(ang);

        const px = cx;
        const py = RECORD_Y - cz * Math.sin(ORBIT_INC);
        const pz = cz * Math.cos(ORBIT_INC);

        const ry = lerp(-cam.yaw, 0, eu);
        const rx = lerp(-cam.pitch, 90, eu);  // 90deg = lying flat on the platter
        const sc = lerp(1, PLATTER_SCALE, eu);

        sat.style.transform =
          `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, ${pz.toFixed(1)}px)` +
          ` rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`;

        // The disc spins inside the satellite rather than the satellite itself
        // spinning, so the label under it stays upright.
        const rate = still ? 0 : lerp(ORBIT_SPIN, st.playing ? PLAY_SPIN : 0, eu);
        spinRef.current[i] += rate * dt;
        const disc = discRefs.current[i];
        if (disc) disc.style.transform = `rotateZ(${spinRef.current[i].toFixed(1)}deg)`;

        const tag = tagRefs.current[i];
        if (tag) tag.style.opacity = clamp(1 - u * 2.4, 0, 1).toFixed(3);

        const ghosts = ghostRefs.current[i];
        for (let g = 0; g < ghosts.length; g++) {
          const node = ghosts[g];
          if (!node) continue;
          const ga = ang - (g + 1) * TRAIL_STEP;
          const gx = r * Math.cos(ga);
          const gz = r * Math.sin(ga);
          node.style.transform =
            `translate3d(${gx.toFixed(1)}px, ${(RECORD_Y - gz * Math.sin(ORBIT_INC)).toFixed(1)}px,` +
            ` ${(gz * Math.cos(ORBIT_INC)).toFixed(1)}px) ${bill} scale(${(0.86 - g * 0.17).toFixed(3)})`;
          node.style.opacity = ((0.32 - g * 0.09) * (1 - u)).toFixed(3);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [records]);

  // ---------------------------------------------------------------- gestures
  const pickRecord = useCallback((rec) => {
    // A drag that happened to start on a record is a camera swing, not a pick.
    if (lastMovedRef.current > 10) {
      lastMovedRef.current = 0;
      return;
    }
    lastMovedRef.current = 0;
    if (loaded?.record.id === rec.id) {
      startEject();
      return;
    }
    // Straight through, inside the real click handler -- App starts playback in
    // a layout effect on this same tick and iOS only allows that inside the
    // user-activation window.
    onTapLoad(rec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, onTapLoad]);

  const startEject = useCallback(() => {
    const rec = loaded?.record;
    if (!rec || ejectingRef.current) return;
    ejectingRef.current = rec.id;
    onEjectStart();  // sound goes now; the record is still flying back to orbit
  }, [loaded, onEjectStart]);

  const onSatKeyDown = (rec) => (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      lastMovedRef.current = 0;
      pickRecord(rec);
    }
  };

  const seekFrom = (e) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    audio.seek(clamp((e.clientX - r.left) / r.width, 0, 1));
  };

  const onBarDown = (e) => {
    e.stopPropagation();
    seekingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekFrom(e);
  };
  const onBarMove = (e) => {
    if (seekingRef.current) seekFrom(e);
  };
  const onBarUp = (e) => {
    seekingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onBarKeyDown = (e) => {
    const p = audio.progress / 100;
    if (e.key === "ArrowRight") { e.preventDefault(); audio.seek(clamp(p + 0.05, 0, 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); audio.seek(clamp(p - 0.05, 0, 1)); }
  };

  return (
    <div className={`orbit-root${reduced ? " orbit-still" : ""}`} ref={rootRef}>
      <div className="orbit-stars" aria-hidden="true" />

      <div className="orbit-viewport" ref={viewportRef} onPointerDown={beginDrag}>
        <div className="orbit-world" ref={worldRef}>
          <div className="orbit-sun" ref={sunRef} aria-hidden="true">
            <div className="orbit-sun-bands" />
          </div>

          <div className="orbit-grid" aria-hidden="true">
            <div className="orbit-grid-lines" />
          </div>

          {/* The platter's light, pooled on the floor directly beneath it. */}
          <div className={`orbit-pool${record ? " is-live" : ""}`} aria-hidden="true" />

          <div className={`orbit-platter${record ? " is-live" : ""}`}>
            <div className="orbit-platter-halo" />
            <div className="orbit-platter-body">
              <div className="orbit-platter-ticks" />
            </div>
            <div className="orbit-platter-rim" />
            <div className="orbit-platter-spindle" />
            {/* Remounted on every landing so the one-shot flare replays. */}
            <div className="orbit-platter-flare" key={flareKey} />
          </div>

          {records.map((rec, i) => {
            const accent = ACCENTS[ACCENT_BY_ID[rec.id] ?? i % ACCENTS.length];
            const isOn = loaded?.record.id === rec.id;
            return (
              <React.Fragment key={rec.id}>
                {Array.from({ length: TRAIL_COUNT }, (_, g) => (
                  <div
                    key={g}
                    className="orbit-ghost"
                    aria-hidden="true"
                    ref={(node) => { ghostRefs.current[i][g] = node; }}
                    style={{ background: `radial-gradient(circle, ${rgba(accent, 0.85)} 0%, ${rgba(accent, 0)} 68%)` }}
                  />
                ))}

                <div
                  className={`orbit-sat${isOn ? " is-loaded" : ""}`}
                  ref={(node) => { satRefs.current[i] = node; }}
                  style={{ "--o-accent": accent, "--o-accent-soft": rgba(accent, 0.55) }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isOn}
                  aria-label={isOn ? `Eject ${rec.title}` : `Load ${rec.title}`}
                  onClick={() => pickRecord(rec)}
                  onKeyDown={onSatKeyDown(rec)}
                >
                  <div className="orbit-sat-glow" />
                  <div className="orbit-disc" ref={(node) => { discRefs.current[i] = node; }}>
                    <div className="orbit-disc-label" style={{ background: rec.color }} />
                    <div className="orbit-disc-hole" />
                  </div>
                  <div className="orbit-sat-sheen" />
                  <div className="orbit-sat-tag" ref={(node) => { tagRefs.current[i] = node; }}>
                    {rec.title}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="orbit-haze" aria-hidden="true" />
      <div className="orbit-scanlines" aria-hidden="true" />

      <div className="orbit-ui">
        <header className="orbit-head">
          <h1 className="orbit-name" data-text="Paulina Liwanag">Paulina Liwanag</h1>
          <p className="orbit-tagline">
            Software engineer — backend by trade, front-end by choice.
          </p>
          <p className="orbit-hint">
            Drag to orbit the camera · scroll or pinch to dolly · pick a record out of the ring
          </p>
        </header>

        <div className="orbit-mid">
          {record && (
            <section className="orbit-panel" aria-live="polite">
              <div className="orbit-panel-edge" aria-hidden="true" />
              <h2 className="orbit-panel-title">{record.title}</h2>
              <div className="orbit-panel-body">{record.body}</div>
            </section>
          )}
        </div>

        <div className="orbit-deck">
          {record ? (
            <>
              <div className="orbit-deck-track">
                <span className="orbit-deck-dot" />
                <span className="orbit-deck-label">{record.trackLabel}</span>
              </div>

              <div
                className="orbit-bar"
                ref={barRef}
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(audio.progress)}
                onPointerDown={onBarDown}
                onPointerMove={onBarMove}
                onPointerUp={onBarUp}
                onPointerCancel={onBarUp}
                onKeyDown={onBarKeyDown}
              >
                <div className="orbit-bar-fill" style={{ transform: `scaleX(${audio.progress / 100})` }} />
                {/* Full-width carrier: a percentage translate resolves against
                    its own box, so this is the only way to move the head with a
                    transform instead of a layout property. */}
                <div className="orbit-bar-cursor" style={{ transform: `translateX(${audio.progress}%)` }}>
                  <i className="orbit-bar-head" />
                </div>
              </div>

              <div className="orbit-time">
                <span>{formatTime(audio.progress, audio.duration)}</span>
                <span>{formatTime(100, audio.duration)}</span>
              </div>

              <div className="orbit-keys">
                <button
                  type="button"
                  className={`orbit-key${audio.isPlaying ? " is-on" : ""}`}
                  onClick={audio.toggle}
                  aria-label={audio.isPlaying ? "Pause" : "Play"}
                >
                  <FontAwesomeIcon icon={audio.isPlaying ? faPause : faPlay} />
                  <span>{audio.isPlaying ? "Pause" : "Play"}</span>
                </button>
                <button type="button" className="orbit-key" onClick={audio.stop} aria-label="Stop">
                  <FontAwesomeIcon icon={faStop} />
                  <span>Stop</span>
                </button>
                <button type="button" className="orbit-key orbit-key-eject" onClick={startEject} aria-label="Eject">
                  <FontAwesomeIcon icon={faEject} />
                  <span>Eject</span>
                </button>
              </div>
            </>
          ) : (
            <p className="orbit-deck-idle">Deck empty — select a record from the ring</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stage;

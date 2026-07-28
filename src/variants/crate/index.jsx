import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop, faEject, faRotate } from "@fortawesome/free-solid-svg-icons";

import { formatTime } from "../../audio/useTurntableAudio";
import { SleeveArt, LinerNotes } from "./Sleeve";
import CrateBox from "./CrateBox";
import { clamp, reduceMotion } from "./dig";
import "./crate.css";

// Crate Digger. The page is a wooden crate seen in CSS 3D, sleeves standing
// upright and receding into it. You push through them one at a time; the one
// you pull out goes on the deck, starts playing, and flips over so its back --
// the record's `body` -- can be read.
//
// The crate itself lives in ./CrateBox, because Studio Crate digs through the
// same one. What is left here is the deck half: the flipping sleeve, the
// transport, and the two flights between crate and deck.

const CrateStage = ({ records, loaded, onTapLoad, onEject, onEjectStart, audio, isCoarsePointer }) => {
  const [flipped, setFlipped] = useState(false);
  // Bumped on every fresh pull so the arrival effect re-runs even when the same
  // record is pulled twice in a row.
  const [arrival, setArrival] = useState(null);

  const crateRef = useRef(null);
  const flyRef = useRef(null);
  const ejectingRef = useRef(false);

  const loadedId = loaded?.record.id ?? null;

  /* ---------------------------------------------------------------- pulling */

  // The gesture handler, and it stays one: onTapLoad is called synchronously
  // here, inside the real click, because iOS only unlocks audio inside a
  // genuine user gesture. Nothing about the animation is allowed to defer it.
  const pull = useCallback(
    (record, el) => {
      // Pulling the record that is already on the deck just turns it over --
      // there is nothing to load, and re-flying it would be a lie.
      if (loadedId === record.id) {
        setFlipped((f) => !f);
        return;
      }

      const r = el.getBoundingClientRect();
      const rect = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width };
      setArrival({ rect, n: Date.now() });
      onTapLoad(record, rect);
    },
    [loadedId, onTapLoad]
  );

  // The record flies from the crate to the deck by measuring where it landed
  // and playing it backwards from where it started (FLIP). Doing it this way
  // rather than with a keyframe means the flight is correct no matter where in
  // the stack the sleeve was, or how the page happens to be laid out.
  useLayoutEffect(() => {
    const el = flyRef.current;
    if (!el || !arrival || reduceMotion) return;

    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const dx = arrival.rect.cx - (r.left + r.width / 2);
    const dy = arrival.rect.cy - (r.top + r.height / 2);
    const scale = clamp(arrival.rect.width / r.width, 0.12, 2);

    el.style.transition = "none";
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale}) rotate(-6deg)`;
    el.style.opacity = "0.65";
    void el.offsetWidth; // flush, so the line below is a transition and not a set
    el.style.transition =
      "transform 660ms cubic-bezier(.16,.84,.28,1), opacity 260ms ease-out";
    el.style.transform = "";
    el.style.opacity = "";
  }, [arrival]);

  // Auto-turn to the liner notes shortly after arrival: the notes are the
  // point of pulling the record, so nobody should have to discover a second
  // gesture to read them. The button and the sleeve itself toggle it back.
  useEffect(() => {
    if (!loadedId) {
      setFlipped(false);
      return undefined;
    }
    setFlipped(false);
    if (reduceMotion) {
      setFlipped(true);
      return undefined;
    }
    const t = setTimeout(() => setFlipped(true), 950);
    return () => clearTimeout(t);
  }, [loadedId]);

  useEffect(() => {
    // A new record on the deck means whatever eject was in flight is moot.
    ejectingRef.current = false;
  }, [loadedId]);

  /* --------------------------------------------------------------- ejecting */

  // onEjectStart kills the sound now; onEject only fires once the sleeve has
  // physically landed back in its slot, because the record has to stay mounted
  // for the whole flight.
  const doEject = useCallback(() => {
    if (!loaded || ejectingRef.current) return;
    ejectingRef.current = true;
    onEjectStart();
    setFlipped(false);

    const crate = crateRef.current;
    // File the crate back to the slot this record came out of, so the flight
    // has a visible gap to land in.
    crate?.goTo(crate.indexOfRecord(loadedId));

    const el = flyRef.current;
    const scene = crate?.getScene();

    let done = false;
    const land = () => {
      if (done) return;
      done = true;
      ejectingRef.current = false;
      onEject();
    };

    if (!el || !scene || reduceMotion || typeof el.animate !== "function") {
      land();
      return;
    }

    // Clear anything the arrival transition left inline, or it fights the
    // keyframes below.
    el.style.transition = "none";
    el.style.transform = "";
    el.style.opacity = "";

    const r = el.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (r.left + r.width / 2);
    const dy = s.top + s.height * 0.46 - (r.top + r.height / 2);
    const scale = clamp((s.width * 0.5) / r.width, 0.12, 1);

    const anim = el.animate(
      [
        { transform: "translate3d(0,0,0) scale(1) rotate(0deg)", opacity: 1 },
        {
          transform: `translate3d(${dx * 0.5}px, ${dy * 0.42 - 44}px, 0) scale(${(1 + scale) / 2}) rotate(-5deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale}) rotate(0deg)`,
          opacity: 0,
        },
      ],
      { duration: 620, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }
    );
    anim.onfinish = land;
    anim.oncancel = land;
    // Backstop: a cancelled or never-started animation must not strand the
    // record on the deck with no sound and no way off.
    setTimeout(land, 900);
  }, [loaded, loadedId, onEject, onEjectStart]);

  /* ----------------------------------------------------------------- render */

  const elapsed = formatTime(audio.progress, audio.duration);
  const total = formatTime(100, audio.duration);

  return (
    <div className="crate-stage">
      <div className="crate-room" aria-hidden="true" />

      <header className="crate-head">
        <h1 className="crate-title">Hi there, I&rsquo;m Paulina!</h1>
        <p className="crate-sub">
          Dig through the crate &mdash; drag, swipe or use the arrows. Pull a record
          out to play it and read the back of the sleeve.
        </p>
      </header>

      <div className="crate-layout">
        <CrateBox
          ref={crateRef}
          className="crate-col crate-col--dig"
          records={records}
          loadedId={loadedId}
          onPull={pull}
          isCoarsePointer={isCoarsePointer}
        />

        {/* -------------------------------------------------------- the deck */}
        <section className="crate-col crate-col--deck">
          {loaded ? (
            <>
              {/* `flipped` drives three things off one boolean: the card's
                  height (here), the rotation (.crate-flipper) and which face is
                  allowed to be visible (.is-away). They cannot disagree, so the
                  toggle button's label always describes the side on show. */}
              <div className={`crate-out${flipped ? " is-flipped" : ""}`}>
                <div
                  className={`crate-disc${audio.isPlaying ? " is-spinning" : ""}`}
                  aria-hidden="true"
                >
                  <span className="crate-disc-label" style={{ background: loaded.record.color }} />
                </div>

                <div className="crate-fly" ref={flyRef}>
                  <div className={`crate-flipper${flipped ? " is-flipped" : ""}`}>
                    <div
                      className={`crate-side crate-side--front${flipped ? " is-away" : ""}`}
                      aria-hidden={flipped}
                    >
                      <SleeveArt record={loaded.record} />
                    </div>
                    <div
                      className={`crate-side crate-side--back${flipped ? "" : " is-away"}`}
                      aria-hidden={!flipped}
                    >
                      <LinerNotes record={loaded.record} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="crate-transport">
                <div className="crate-nowplaying">
                  <span className="crate-nowplaying-dot" data-on={audio.isPlaying || undefined} />
                  <span>{loaded.record.trackLabel}</span>
                </div>

                <div className="crate-scrub-row">
                  <span className="crate-time">{elapsed}</span>
                  <input
                    className="crate-scrub"
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={audio.progress}
                    onChange={(e) => audio.seek(Number(e.target.value) / 100)}
                    aria-label="Seek within track"
                    style={{ "--fill": `${audio.progress}%` }}
                  />
                  <span className="crate-time">{total}</span>
                </div>

                <div className="crate-buttons">
                  <button
                    type="button"
                    className="crate-btn"
                    onClick={audio.toggle}
                    aria-label={audio.isPlaying ? "Pause" : "Play"}
                  >
                    <FontAwesomeIcon icon={audio.isPlaying ? faPause : faPlay} />
                    <span>{audio.isPlaying ? "Pause" : "Play"}</span>
                  </button>
                  <button type="button" className="crate-btn" onClick={audio.stop} aria-label="Stop">
                    <FontAwesomeIcon icon={faStop} />
                    <span>Stop</span>
                  </button>
                  <button
                    type="button"
                    className="crate-btn"
                    onClick={() => setFlipped((f) => !f)}
                    aria-pressed={flipped}
                  >
                    <FontAwesomeIcon icon={faRotate} />
                    <span>{flipped ? "Cover" : "Notes"}</span>
                  </button>
                  <button
                    type="button"
                    className="crate-btn crate-btn--eject"
                    onClick={doEject}
                    aria-label="Eject, and file the record back in the crate"
                  >
                    <FontAwesomeIcon icon={faEject} />
                    <span>Eject</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="crate-empty">
              <div className="crate-empty-slot" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="crate-empty-head">Nothing on the deck.</p>
              <p className="crate-empty-body">
                Flip through the crate and pull a record out. It starts playing, and the
                back of the sleeve is where the actual writing is.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CrateStage;

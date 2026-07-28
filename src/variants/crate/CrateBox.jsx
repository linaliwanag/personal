import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faHand } from "@fortawesome/free-solid-svg-icons";

import { SleeveArt, FillerArt, DividerArt, metaFor } from "./Sleeve";
import { buildCrate, clamp, poseFor, CULL_BACK, CULL_FRONT } from "./dig";

// The wooden crate you dig through, and nothing else -- no deck, no transport,
// no page. Crate Digger wraps it in a whole page; Studio Crate parks it next to
// the turntable. Everything about *what happens to a record once it is out* is
// the host's business, which is why the only thing this reports upward is
// `onPull`.
//
// The scene is driven by a single scalar: `position`, the fractional index of
// whichever sleeve is currently under your fingers. Every sleeve's transform is
// a pure function of `index - position`, so a drag (fractional) and an arrow key
// (integer) produce the same motion through the same code path. That is why
// there is no per-sleeve animation state anywhere below.
//
// The ref handle exists for one reason: ejecting. The host has to measure this
// scene to fly the record home, and has to file the crate back to the slot the
// record came out of -- both of which need to reach in here.
const CrateBox = forwardRef(function CrateBox(
  // `flipOnDeck` says what pulling the record that is *already* on the deck
  // means. Crate Digger turns the sleeve over, because its back is where the
  // notes are. Studio Crate has a liner panel for that, so there the gesture
  // does nothing -- and the button has to stop offering it rather than sit
  // there as a control that visibly does nothing when pressed.
  { records, loadedId, onPull, isCoarsePointer, className = "", label, flipOnDeck = true },
  ref
) {
  const items = useMemo(() => buildCrate(records), [records]);
  const firstRecordIndex = useMemo(
    () => Math.max(items.findIndex((i) => i.kind === "record"), 0),
    [items]
  );

  // `cursor` is the committed integer index; `drag` is the live fractional
  // offset while a finger is down. Their sum is what the scene is drawn from.
  const [cursor, setCursor] = useState(firstRecordIndex);
  const [drag, setDrag] = useState(0);

  const sceneRef = useRef(null);
  const pointerRef = useRef(null);
  const dragRef = useRef(0);
  // Set on pointerup when the gesture travelled far enough to count as a drag.
  // The click that follows is then the tail of that drag, not a tap, and must
  // not pull a record out.
  const movedRef = useRef(false);

  const step = useCallback(
    (delta) => setCursor((c) => clamp(c + delta, 0, items.length - 1)),
    [items.length]
  );

  useImperativeHandle(
    ref,
    () => ({
      getScene: () => sceneRef.current,
      // Used on eject, so the crate is already showing the gap the record is
      // flying back into.
      goTo: (index) => {
        if (index >= 0) setCursor(clamp(index, 0, items.length - 1));
      },
      indexOfRecord: (id) =>
        items.findIndex((i) => i.kind === "record" && i.record.id === id),
    }),
    [items]
  );

  /* ------------------------------------------------------------------ digging */

  // Pointer drag. Horizontal is the primary axis on every device so the crate
  // can keep `touch-action: pan-y` and leave vertical page scrolling alone;
  // vertical only contributes for fine pointers, where there is no such
  // conflict and pushing "down and away" feels right with a mouse.
  const stepPx = isCoarsePointer ? 58 : 78;

  const onPointerDown = (e) => {
    if (e.button > 0) return;
    movedRef.current = false;
    pointerRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base: cursor,
      captured: false,
    };
    // Deliberately no setPointerCapture here. Capturing on pointerdown makes
    // the browser route the compatibility mouse events to the capture element
    // too, which can retarget the following `click` away from the sleeve's
    // button -- and that click is the only place onTapLoad may legally be
    // called. Capture is taken below, once the gesture is unambiguously a drag.
  };

  const onPointerMove = (e) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (!p.captured && Math.abs(dx) + Math.abs(dy) > 8) {
      p.captured = true;
      movedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safari throws if the pointer has already been released. The drag
        // still tracks off the scene's own move events until it leaves.
      }
    }

    const travel = (-dx + (isCoarsePointer ? 0 : -dy * 0.55)) / stepPx;
    const next = clamp(travel, -p.base, items.length - 1 - p.base);
    dragRef.current = next;
    setDrag(next);
  };

  const endPointer = (e) => {
    const p = pointerRef.current;
    if (!p || (e && p.id !== e.pointerId)) return;
    pointerRef.current = null;
    setCursor(clamp(Math.round(p.base + dragRef.current), 0, items.length - 1));
    dragRef.current = 0;
    setDrag(0);
  };

  // Before the threshold there is no pointer capture, so a pointer that wanders
  // off the scene would otherwise leave the gesture hanging. Once captured, the
  // events keep arriving and leaving the box means nothing.
  const onPointerLeave = (e) => {
    if (pointerRef.current?.captured) return;
    endPointer(e);
  };

  // Trackpad two-finger *horizontal* swipe only. Claiming the vertical wheel
  // would trap the page, and on a phone this never fires anyway.
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    step(e.deltaX > 0 ? 1 : -1);
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        step(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        step(-1);
        break;
      case "Home":
        e.preventDefault();
        setCursor(0);
        break;
      case "End":
        e.preventDefault();
        setCursor(items.length - 1);
        break;
      default:
        break;
    }
  };

  /* ------------------------------------------------------------------- render */

  // While a finger is down the scene is drawn from the gesture's own starting
  // index, not from `cursor`. Pressing a sleeve focuses its button, which nudges
  // `cursor` -- and reading that mid-drag would make the stack jump by however
  // far the pressed sleeve was from the front.
  const gesture = pointerRef.current;
  const position = (gesture ? gesture.base : cursor) + drag;

  const front = items[cursor];
  const frontRecord = front?.kind === "record" ? front.record : null;
  const frontMeta = frontRecord ? metaFor(frontRecord) : null;

  return (
    <section className={className}>
      <div
        className="crate-scene"
        ref={sceneRef}
        role="group"
        tabIndex={0}
        aria-label={label || "Record crate. Use left and right arrow keys to flip through it."}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <div className="crate-world">
          <div className="crate-box" aria-hidden="true">
            <div className="crate-face crate-face--back" />
            <div className="crate-face crate-face--left" />
            <div className="crate-face crate-face--right" />
            <div className="crate-face crate-face--floor" />
            <div className="crate-face crate-face--rail">
              <span className="crate-stencil">Liwanag Recordings &mdash; 33&#8531; &mdash; Used</span>
            </div>
            <div className="crate-shadow" />
          </div>

          <div className="crate-stack">
            {items.map((item, index) => {
              const d = index - position;
              const isRecord = item.kind === "record";
              // Records never unmount: one of them may hold focus, and yanking
              // a focused button out of the DOM sends focus to <body> mid-dig.
              if (!isRecord && (d < -CULL_FRONT || d > CULL_BACK)) return null;

              const pose = poseFor(d);
              const style = {
                transform: pose.transform,
                opacity: pose.opacity,
                filter: `brightness(${pose.brightness})`,
                // A drag has to track the finger exactly; only the settle after
                // release, and the arrow-key steps, get eased.
                transition: gesture ? "none" : undefined,
              };

              if (!isRecord) {
                return (
                  <div
                    key={item.key}
                    className={`crate-sleeve crate-sleeve--${item.kind}`}
                    style={style}
                    aria-hidden="true"
                  >
                    {item.kind === "filler" ? (
                      <FillerArt tone={item.tone} label={item.label} />
                    ) : (
                      <DividerArt label={item.label} />
                    )}
                  </div>
                );
              }

              const onDeck = loadedId === item.record.id;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`crate-sleeve crate-sleeve--record${onDeck ? " is-onDeck" : ""}${
                    index === cursor ? " is-front" : ""
                  }`}
                  style={{
                    ...style,
                    // A pulled record leaves a hole. Fading it out here is
                    // cheaper and steadier than unmounting it, and the slot
                    // stays where the eject flight aims.
                    opacity: onDeck ? Math.min(pose.opacity, 0.35) : pose.opacity,
                  }}
                  onClick={(e) => {
                    // The click that closes a drag is not a tap. The guard lives
                    // here rather than in onPull so the explicit "Pull out"
                    // button below is never blocked by a drag the reader
                    // finished a moment ago.
                    if (movedRef.current) return;
                    setCursor(index);
                    onPull(item.record, e.currentTarget, index);
                  }}
                  onFocus={() => setCursor(index)}
                  aria-disabled={onDeck && !flipOnDeck ? true : undefined}
                  aria-label={
                    onDeck
                      ? flipOnDeck
                        ? `${item.record.title} is on the deck. Activate to turn the sleeve over.`
                        : `${item.record.title} is on the deck.`
                      : `Pull out ${item.record.title} — ${item.record.trackLabel}`
                  }
                >
                  {onDeck ? (
                    <span className="crate-slot" aria-hidden="true">
                      <span>pulled</span>
                    </span>
                  ) : (
                    <SleeveArt record={item.record} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discrete equivalents for everything the drag does. Touch and keyboard
          both land here. */}
      <div className="crate-dig-bar">
        <button
          type="button"
          className="crate-btn crate-btn--nudge"
          onClick={() => step(-1)}
          disabled={cursor <= 0}
          aria-label="Flip back one sleeve"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div className="crate-readout" aria-live="polite">
          {frontRecord ? (
            <>
              <strong className="crate-readout-title">{frontRecord.title}</strong>
              <span className="crate-readout-meta">
                {frontMeta.genre} &middot; {frontMeta.year} &middot; {frontMeta.press} &middot; {frontMeta.price}
              </span>
            </>
          ) : (
            <>
              <strong className="crate-readout-title crate-readout-title--dim">
                {front?.kind === "divider" ? `Divider ${front.label}` : "Not one of mine"}
              </strong>
              <span className="crate-readout-meta">
                {front?.kind === "divider"
                  ? "Keep going — there's something filed behind this."
                  : "Filler. Flip past it."}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          className="crate-btn crate-btn--nudge"
          onClick={() => step(1)}
          disabled={cursor >= items.length - 1}
          aria-label="Flip forward one sleeve"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <button
        type="button"
        className="crate-btn crate-btn--pull"
        disabled={!frontRecord || (loadedId === frontRecord.id && !flipOnDeck)}
        onClick={(e) => {
          // Same synchronous path as tapping the sleeve: this button is measured
          // against the front sleeve's rect via the scene, so the flight still
          // starts from the crate.
          if (!frontRecord) return;
          const target =
            sceneRef.current?.querySelector(".crate-sleeve--record.is-front") ||
            sceneRef.current ||
            e.currentTarget;
          onPull(frontRecord, target, cursor);
        }}
      >
        <FontAwesomeIcon icon={faHand} />
        <span>
          {frontRecord
            ? loadedId === frontRecord.id
              ? flipOnDeck
                ? `Turn ${frontRecord.title} over`
                : `${frontRecord.title} is on the deck`
              : `Pull out ${frontRecord.title}`
            : "Nothing to pull here"}
        </span>
      </button>
    </section>
  );
});

export default CrateBox;

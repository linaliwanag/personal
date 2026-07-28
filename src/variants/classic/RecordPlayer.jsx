import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import "./RecordPlayer.css";

import Content from "../../components/Content";
import { formatTime } from "../../audio/useTurntableAudio";
import { isCoarsePointer } from "../../pointer";

// How long the record takes to travel between its slot in the menu and the
// platter. The button eject gets a little longer because it also plays the
// lift-off beat first.
const EJECT_FLIGHT_MS = 560;
const DRAG_FLIGHT_MS = 420;
const LOAD_FLIGHT_MS = 520;

const RecordPlayer = ({ loaded, onLoad, onEjectComplete, onEjectStart, audio }) => {
  const record = loaded?.record ?? null;

  const [dropActive, setDropActive] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const vinylElRef = useRef(null);
  const isReturningRef = useRef(false);
  const flightTimeoutRef = useRef(null);
  const loadFlightTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const contentRef = useRef(null);

  const isPlaying = audio.isPlaying;

  // useLayoutEffect, not useEffect: React flushes discrete input events (click,
  // touchend) synchronously, so a layout effect scheduled by one still runs
  // inside the browser's user-activation window. A passive effect would land
  // after it had expired and iOS would refuse to play. Playback itself is
  // kicked off by App on that same tick, for exactly the same reason.
  useLayoutEffect(() => {
    if (!loaded) return;

    if (loaded.source === "tap" && loaded.fromRect) {
      flyIn(loaded.fromRect);
    } else {
      // The drop path keeps the original "record lands on the platter" beat --
      // it reads right when you've released the record over the player, where a
      // flight from the menu would not.
      setIsEntering(true);
    }

    const enterTimer = setTimeout(() => setIsEntering(false), 500);
    // Touch only. On a phone the content sits far enough below the fold that
    // nothing appears to have happened without this; on desktop it's already
    // near the fold, and scrolling to it would shove the player -- the thing the
    // reader just interacted with -- off the top of the screen.
    //
    // Held until after the flight rather than fired immediately: the flight path
    // is measured in viewport coordinates, so scrolling mid-flight would make
    // the record miss the platter it was aimed at.
    if (isCoarsePointer) {
      scrollTimeoutRef.current = setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, LOAD_FLIGHT_MS + 80);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(scrollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const handleTrackDrop = (item) => {
    if (!item?.record) {
      console.error("No record received! Check Vinyl component.");
      return;
    }
    onLoad(item.record);
    setDropActive(false);
  };

  // Measures the record's home slot in the menu. Returns the delta from the
  // player vinyl's centre to the slot's centre, plus the scale and opacity the
  // slot is *currently rendered at* -- while a record is on the player its menu
  // slot sits there dimmed and shrunk. Landing the flying record on exactly
  // those values means it and the menu slot are pixel-identical at the moment
  // of hand-off, so unmounting one and un-dimming the other is invisible.
  const measureHomeSlot = () => {
    const playerVinylEl = vinylElRef.current;
    const menuVinylEl = record
      ? document.querySelector(`.vinyl-record[data-record-id="${CSS.escape(record.id)}"]`)
      : null;
    if (!playerVinylEl || !menuVinylEl) return null;

    const playerRect = playerVinylEl.getBoundingClientRect();
    const slotRect = menuVinylEl.getBoundingClientRect();
    // We measure while the record is still spinning, and a rotated square's
    // bounding box is up to ~1.41x its real width -- so the scale has to come
    // from offsetWidth, which ignores transforms. Centres are safe to take from
    // the rects: rotation is about the centre, so it doesn't move.
    const playerWidth = playerVinylEl.offsetWidth;
    if (!playerWidth || !slotRect.width) return null;

    return {
      x: (slotRect.left + slotRect.width / 2) - (playerRect.left + playerRect.width / 2),
      y: (slotRect.top + slotRect.height / 2) - (playerRect.top + playerRect.height / 2),
      scale: slotRect.width / playerWidth,
      opacity: Number(window.getComputedStyle(menuVinylEl).opacity) || 1,
    };
  };

  // The mirror image of flyHome: the record lifts off the menu slot that was
  // tapped and lands on the platter. `from` is that slot's rect captured at the
  // moment of the tap -- before it starts dimming -- so the record leaves from
  // exactly where the finger was, and the slot fades out behind it.
  //
  // No opacity animation here, unlike the flight home: the record is at full
  // opacity for the whole trip, and it's the slot underneath that dims.
  const flyIn = (from) => {
    const el = vinylElRef.current;
    if (!el) return;

    const playerRect = el.getBoundingClientRect();
    const playerWidth = el.offsetWidth;
    if (!playerWidth || !from.width) return;

    const dx = from.cx - (playerRect.left + playerRect.width / 2);
    const dy = from.cy - (playerRect.top + playerRect.height / 2);
    const scale = from.width / playerWidth;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
      return;
    }

    const flight = el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          easing: "cubic-bezier(0.34, 0, 0.4, 1)",
        },
        // Overshoots slightly past the platter before settling, so the record
        // reads as having weight rather than sliding into place.
        {
          offset: 0.72,
          transform: `translate(${dx * 0.1}px, ${dy * 0.1 - 14}px) scale(1.06)`,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
        { transform: "translate(0px, 0px) scale(1)" },
      ],
      { duration: LOAD_FLIGHT_MS }
    );

    // Same guarantee the flight home gets from its timer, for the same reason:
    // if the document timeline is stalled (backgrounded tab, throttled frames)
    // the animation can sit at its first keyframe indefinitely, which here means
    // the record hangs in mid-air over the menu instead of landing. Cancelling
    // drops it onto the platter -- the animation has no fill, so its natural
    // state *is* the landed one.
    clearTimeout(loadFlightTimeoutRef.current);
    loadFlightTimeoutRef.current = setTimeout(() => {
      if (flight.playState !== "finished") flight.cancel();
    }, LOAD_FLIGHT_MS + 60);
  };

  const finishFlight = () => {
    if (!isReturningRef.current) return;
    isReturningRef.current = false;
    clearTimeout(flightTimeoutRef.current);
    flightTimeoutRef.current = null;
    setIsReturning(false);
    onEjectComplete();
  };

  // The single eject animation, shared by the Eject button and the drag-off.
  // `from` is where the record starts relative to its resting spot on the
  // player -- {0,0} for the button, the drag delta for a drag-off -- so a
  // dragged record picks the flight up from exactly where it was dropped
  // instead of snapping back to the platter first.
  //
  // Uses the Web Animations API rather than toggling CSS classes across rAF
  // ticks: the whole from/to path is declared in one call, so it can't
  // half-apply if a frame is dropped or the tab isn't actively rendering.
  const flyHome = (from, { duration, liftOff }) => {
    if (!record || isReturningRef.current) return;
    isReturningRef.current = true;
    onEjectStart();
    setIsReturning(true);

    const el = vinylElRef.current;
    const home = measureHomeSlot();
    if (!el || !home) {
      finishFlight();
      return;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const flightMs = reduceMotion ? 140 : duration;
    const at = (offset, x, y, scale, easing) => ({
      offset,
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      ...(easing ? { easing } : {}),
    });

    // Transform and opacity run as two animations so their timings stay
    // independent: the record holds full opacity for most of the trip and only
    // settles into the slot's dimmed state as it arrives. Interleaving them as
    // shared keyframes would force the easing curve to restart mid-flight.
    const path = liftOff && !reduceMotion
      ? [
          at(0, from.x, from.y, from.scale, "cubic-bezier(0.34, 0, 0.5, 1)"),
          at(0.2, from.x, from.y - 18, from.scale * 1.06, "cubic-bezier(0.22, 1, 0.36, 1)"),
          at(1, home.x, home.y, home.scale),
        ]
      : [
          at(0, from.x, from.y, from.scale, "cubic-bezier(0.22, 1, 0.36, 1)"),
          at(1, home.x, home.y, home.scale),
        ];

    el.animate(path, { duration: flightMs, fill: "forwards" });
    const flight = el.animate(
      [{ opacity: 1 }, { opacity: home.opacity }],
      {
        duration: Math.round(flightMs * 0.45),
        delay: Math.round(flightMs * 0.55),
        easing: "ease-out",
        fill: "both",
      }
    );

    // The hand-off is driven by a timer rather than onfinish alone: onfinish is
    // delivered on a frame tick, so a busy or throttled frame can hold the
    // landed record on screen well past the animation and leave a visible pause
    // before the menu slot lights back up. The timer lands it on schedule and
    // onfinish just gets there first when it can. Both routes are idempotent,
    // and fill:forwards means an early-firing timer still finds the record
    // parked on its final frame.
    flight.onfinish = finishFlight;
    flightTimeoutRef.current = setTimeout(finishFlight, flightMs + 30);
  };

  const ejectVinyl = () => flyHome(
    { x: 0, y: 0, scale: 1 },
    { duration: EJECT_FLIGHT_MS, liftOff: true }
  );

  useEffect(() => () => {
    clearTimeout(flightTimeoutRef.current);
    clearTimeout(loadFlightTimeoutRef.current);
    clearTimeout(scrollTimeoutRef.current);
  }, []);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: handleTrackDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }), [onLoad]);

  const [{ isDraggingOff }, dragOff] = useDrag(() => ({
    type: "PLAYER_VINYL",
    item: () => ({ record, size: vinylElRef.current?.offsetWidth }),
    canDrag: !!record && !isReturning,
    end: (item, monitor) => {
      const dropPoint = monitor.getClientOffset();
      const startPoint = monitor.getInitialClientOffset();
      const from = (dropPoint && startPoint)
        ? { x: dropPoint.x - startPoint.x, y: dropPoint.y - startPoint.y, scale: 1 }
        : { x: 0, y: 0, scale: 1 };

      flyHome(from, { duration: DRAG_FLIGHT_MS, liftOff: false });
    },
    collect: (monitor) => ({ isDraggingOff: !!monitor.isDragging() }),
  }), [record, isReturning]);

  // Add effect to handle drop zone active state
  useEffect(() => {
    setDropActive(isOver);
  }, [isOver]);

  return (
    <div
      ref={drop}
      className={`record-player-container ${dropActive ? 'drop-active' : ''}`}
    >
      {/* The spin lives on the platter graphic below, not on this container.
          The record being ejected is a child of this element, so if it rotated,
          the flight home -- measured in viewport coordinates -- would be applied
          in a spinning coordinate frame and the record would spiral off its
          slot instead of landing on it. Keeping the housing still also stops the
          drop hint from rotating out from under the reader. */}
      <div className="record-player">
        <svg
          className={isPlaying && !isReturning ? "spinning" : ""}
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="150" cy="150" r="140" fill="#222" stroke="#111" strokeWidth="5" />
          <g>
            <circle cx="150" cy="150" r="120" fill="black" stroke="gray" strokeWidth="2" />
            {record &&
              [110, 100, 90, 80, 70, 60, 50, 40, 30, 20].map((r, i) => (
                <circle
                  key={i}
                  cx="150"
                  cy="150"
                  r={r}
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                  strokeDasharray={r % 7 === 0 ? "3,5" : "5,3"}
                />
              ))}
            <circle cx="150" cy="150" r="5" fill="white" />
          </g>
        </svg>

        {/* Vinyl overlay on the player */}
        {record && (
          <div
            ref={(node) => {
              vinylElRef.current = node;
              dragOff(node);
            }}
            className={`vinyl-on-player ${isEntering ? "entering" : ""} ${isPlaying && !isReturning ? "spinning" : ""} ${isReturning ? "returning" : ""} ${isDraggingOff ? "dragging-off" : ""}`}
            style={{ background: record.color }}
          >
            <div className="vinyl-grooves"></div>
          </div>
        )}

        {(dropActive || isDraggingOff) && (
          <div className="drop-indicator">
            <span>{isDraggingOff ? "Drop Anywhere to Eject" : "Drop Record Here"}</span>
          </div>
        )}
      </div>

      {record ? (
        <div className="controls">
          <div className="buttons">
            <button onClick={audio.toggle} className={isPlaying ? "active" : ""}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={audio.stop}>Stop</button>
            <button onClick={() => ejectVinyl()}>Eject</button>
          </div>
          <div className="now-playing">
            <p>{record.trackLabel}</p>
            <div className="progress-bar">
              <div className="progress" style={{ transform: `scaleX(${audio.progress / 100})` }}></div>
            </div>
            <div className="time-display">
              <span>{formatTime(audio.progress, audio.duration)}</span>
              <span>{formatTime(100, audio.duration)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={contentRef}>
        <Content record={record} />
      </div>
    </div>
  );
};

export default RecordPlayer;

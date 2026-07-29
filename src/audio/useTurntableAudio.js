import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// The site's one and only audio engine. It used to live inside RecordPlayer,
// but every UI variant needs the same playback behaviour and none of them
// should have to re-derive the iOS rules below -- so it lives here and the
// variants are handed the controls.
//
// One <audio> element for the page's whole lifetime, rather than a fresh one
// per track. iOS grants permission to play to a *specific element* when the
// user gestures at it, and that permission then sticks for the session -- so
// reusing the element is what makes later, deferred plays (the one behind a
// cross-fade, say) work at all.

// Fraction of the remaining gap closed each frame while the platter changes
// speed. A fader nudge lands inside two frames and reads as instant; a jump
// from 33 to 45 takes about 200ms and sounds like a platter spinning up, which
// is what it is. One code path serves both -- the difference is only ever how
// far it has to travel.
const RATE_GLIDE = 0.22;

// Both properties, deliberately. The media element load algorithm resets
// playbackRate to defaultPlaybackRate on every new src, so a deck left at +6%
// would snap back to dead-on the moment the next record was cued -- fader still
// sitting up at +6, strobe still drifting, sound suddenly disagreeing with both.
// Setting the default is what makes speed a property of the deck rather than of
// the track.
//
// preservesPitch has to be false or the fader is the wrong instrument entirely:
// the default time-stretches, changing tempo while holding pitch, and a
// turntable cannot do that. Speed and pitch move together on vinyl. The two
// prefixed spellings are for Safari and Firefox before they unprefixed it.
const applyRate = (el, rate) => {
  el.preservesPitch = false;
  el.webkitPreservesPitch = false;
  el.mozPreservesPitch = false;
  el.defaultPlaybackRate = rate;
  el.playbackRate = rate;
};

export function useTurntableAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  // 0-100, so a variant can drive a bar with it directly.
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  // Deliberately refs and not state. The rate changes every frame of a glide and
  // on every pointermove of a fader drag; as state it would re-render the whole
  // deck -- 376 nodes of preserve-3d -- for a number nothing renders. The
  // controls already own the values this is derived from.
  const rateRef = useRef(1);       // what the element is set to right now
  const rateTargetRef = useRef(1); // where it is heading
  const rateRafRef = useRef(0);
  // True from the moment an eject begins until the next record is loaded.
  // unload() fades over ~800ms, and the element goes on playing -- and firing
  // ontimeupdate -- for that whole stretch. reset() lands earlier than that (the
  // record's flight home is shorter than the fade), so without this guard a
  // timeupdate arrives *after* the readout has been zeroed and pins the progress
  // bar at whatever the needle was on when eject was pressed, next to a 0:00
  // clock, until something else is cued.
  const unloadingRef = useRef(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.onloadedmetadata = () => setDuration(audio.duration || 0);
      audio.ontimeupdate = () => {
        if (unloadingRef.current) return;
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      // The deck may well have been set off 33 1/3 before anything was ever
      // cued -- the fader and the speed keys work with an empty platter.
      applyRate(audio, rateRef.current);
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // Target speed as a multiple of 33 1/3: 1 is dead-on, 1.35 is the 45 key,
  // and the fader is the +/-8% either side of whichever of those is selected.
  // Called from the controls on every change; cheap to call with a value it is
  // already at.
  const setRate = useCallback((target) => {
    if (!Number.isFinite(target) || target <= 0) return;
    rateTargetRef.current = target;

    const el = audioRef.current;
    if (!el) {
      // Nothing to drive yet. getAudio() will apply this when the element is
      // built, so the first record cued already arrives at the right speed.
      rateRef.current = target;
      return;
    }
    if (rateRafRef.current) return; // a glide is running; it reads the target
    if (Math.abs(target - rateRef.current) < 0.0005) return;

    const step = () => {
      const delta = rateTargetRef.current - rateRef.current;
      if (Math.abs(delta) < 0.0005) {
        rateRef.current = rateTargetRef.current;
        rateRafRef.current = 0;
      } else {
        rateRef.current += delta * RATE_GLIDE;
        rateRafRef.current = requestAnimationFrame(step);
      }
      applyRate(el, rateRef.current);
    };
    rateRafRef.current = requestAnimationFrame(step);
  }, []);

  const fadeIn = (el, step) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    let volume = 0;
    el.volume = 0;
    fadeIntervalRef.current = setInterval(() => {
      if (volume < 0.8) {
        volume = Math.min(volume + step, 0.8);
        el.volume = volume;
      } else {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, 100);
  };

  const fadeOut = (el, step, callback) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    let volume = el.volume;
    fadeIntervalRef.current = setInterval(() => {
      if (volume > 0) {
        volume = Math.max(volume - step, 0);
        el.volume = volume;
      } else {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        callback();
      }
    }, 100);
  };

  // The first play() of the session has to happen synchronously inside the
  // gesture that loaded the record, or iOS rejects it -- which is why App calls
  // this from a layout effect and not from a metadata/canplay callback. Once
  // that first play has been granted, the element is unlocked and the fade-out
  // path below (which resumes on a timer) is allowed too.
  const load = useCallback((record) => {
    const audio = getAudio();

    const begin = () => {
      unloadingRef.current = false;
      audio.src = window.location.origin + record.file;
      audio.volume = 0;
      // Belt and braces over defaultPlaybackRate: the load this src kicks off
      // is what resets playbackRate, and re-asserting it here means the record
      // is never audible for even a frame at a speed the deck is not set to.
      applyRate(audio, rateRef.current);
      setProgress(0);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio, 0.05);
        })
        .catch((error) => {
          setIsPlaying(false);
          // AbortError just means this play() was superseded -- the reader
          // picked another record, or hit eject, before it got going. That's
          // ordinary, not a failure. NotAllowedError means the browser refused
          // autoplay; the record still loads and the Play button is sitting
          // right there, so it recovers on its own.
          if (error.name === "AbortError") return;
          console.error("Audio play failed:", error);
        });
    };

    if (audio.src && !audio.paused) fadeOut(audio, 0.1, begin);
    else begin();
  }, [getAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((error) => console.error("Audio play failed:", error));
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    setIsPlaying((prev) => !prev);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeOut(audio, 0.1, () => {
      audio.currentTime = 0;
      audio.pause();
      setIsPlaying(false);
      setProgress(0);
    });
  }, []);

  // Eject's counterpart to stop(): drops the source entirely, because the
  // record is leaving the player.
  const unload = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    unloadingRef.current = true;
    fadeOut(audio, 0.1, () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      // The needle is off the record now, whatever order this landed in
      // relative to reset().
      setProgress(0);
    });
  }, []);

  // Called once an eject has actually landed, so the readout doesn't blank out
  // while the record is still visibly in flight.
  const reset = useCallback(() => {
    setProgress(0);
    setDuration(0);
  }, []);

  // Jump to a fraction (0-1) of the track. Variants with a draggable tonearm or
  // a scrubbable progress bar use this.
  const seek = useCallback((fraction) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const clamped = Math.min(Math.max(fraction, 0), 1);
    audio.currentTime = clamped * audio.duration;
    setProgress(clamped * 100);
  }, []);

  useEffect(() => () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    if (rateRafRef.current) cancelAnimationFrame(rateRafRef.current);
    audioRef.current?.pause();
  }, []);

  // Memoised so the object identity only changes when playback state actually
  // does. Every variant receives this as a single prop, and a fresh object on
  // each render would invalidate their memoised callbacks for nothing.
  return useMemo(
    () => ({ isPlaying, progress, duration, load, toggle, stop, unload, reset, seek, setRate }),
    [isPlaying, progress, duration, load, toggle, stop, unload, reset, seek, setRate]
  );
}

// Turns a 0-100 progress value into m:ss against a duration in seconds.
// Shared so every variant's time readout agrees.
export const formatTime = (progress, duration) => {
  const totalSeconds = Math.floor((progress * duration) / 100);
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

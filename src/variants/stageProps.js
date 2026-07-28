// The contract between App and the Stage.
//
// A Stage is a default-exported React component that renders the whole page
// body. It owns the heading, the record picker, the player and the content
// panel -- App owns only what is on the player and what is coming out of the
// speakers. The site used to offer six looks behind a switcher and this seam is
// what made that cheap; Studio Crate is the only one left, but the split is
// still worth keeping: it is what stops layout work from touching playback.
//
// A Stage receives exactly these props:
//
//   records          Array of record objects from src/records.jsx. Each is
//                    { id, title, file, trackLabel, color, body }. `color` is a
//                    CSS linear-gradient string; `body` is JSX. Never mutate.
//
//   loaded           null, or { record, source, fromRect }.
//                    `fromRect` ({ cx, cy, width }, viewport coordinates) is
//                    where the sleeve was when it was pulled, so the record can
//                    fly to the platter from there.
//
//   onTapLoad        (record, fromRect?) => void. Puts a record on the player.
//                    Must be called synchronously inside the user's gesture --
//                    iOS only unlocks audio inside a real click/touch handler.
//                    No animation may defer it; play the flight afterwards.
//
//   onEject          () => void. Clears the player. Call it when the eject
//                    animation has *landed*, not when the button is pressed --
//                    the record has to stay mounted for the whole flight.
//
//   onEjectStart     () => void. Fades the audio out and releases the source.
//                    Call this the moment eject begins, so sound stops with the
//                    gesture even though the record is still flying home.
//
//   audio            { isPlaying, progress, duration, toggle, stop, seek }
//                    progress is 0-100. duration is seconds. toggle() is
//                    play/pause, stop() rewinds to zero and pauses, seek(f)
//                    jumps to fraction f (0-1). Loading is App's job -- a Stage
//                    never calls load() itself.
//
//   isCoarsePointer  true on touch devices. Resolved once at module load.
export {};

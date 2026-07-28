// The contract between App and every variant Stage.
//
// A Stage is a default-exported React component that renders the whole page
// body for one look. It receives exactly these props:
//
//   records          Array of record objects from src/records.jsx. Each is
//                    { id, title, file, trackLabel, color, body }. `color` is a
//                    CSS linear-gradient string; `body` is JSX. Never mutate.
//
//   loaded           null, or { record, source, fromRect }.
//                    `source` is "tap" or "drop" -- which gesture put the
//                    record on the player, so a Stage can pick an arrival
//                    animation. `fromRect` ({ cx, cy, width }, viewport
//                    coordinates) is present for taps: where the record was
//                    when it was tapped, so it can fly from there.
//
//   onTapLoad        (record, fromRect?) => void. Puts a record on the player.
//                    Must be called synchronously inside the user's gesture --
//                    iOS only unlocks audio inside a real click/touch handler.
//
//   onDropLoad       (record) => void. Same, for a drag-and-drop arrival.
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
//
// A Stage is mounted inside a react-dnd DndProvider, so useDrag/useDrop are
// available -- but nothing requires a Stage to use them. Pointer events are
// fine, and often better for 3D scenes.
export {};

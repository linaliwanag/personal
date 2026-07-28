// Resolved once at module load rather than from a resize listener: react-dnd
// can't swap backends without remounting the tree beneath it, so this value has
// to stay stable for the session anyway, and a device doesn't change pointer
// type mid-session.
export const isCoarsePointer =
  typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

// Resolved once at module load rather than from a resize listener: a device
// does not change pointer type mid-session, and the crate reads this to size
// its drag step, which should not shift under a gesture in progress.
export const isCoarsePointer =
  typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

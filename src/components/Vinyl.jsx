import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import "./Vinyl.css";

// How long after a drag ends we ignore clicks on this record. TouchBackend
// suppresses the synthetic click after most drags, but not reliably enough to
// bet on -- without this, dropping a record somewhere that isn't the player can
// still fire a click and load it anyway.
const CLICK_AFTER_DRAG_MS = 300;

const Vinyl = ({ record, isOnPlayer = false, onSelect }) => {
  const elRef = useRef(null);
  const draggedAtRef = useRef(0);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VINYL",
    // A function, so size is measured at drag start rather than at render: the
    // drag layer uses it to draw a preview matching whatever the current
    // breakpoint renders.
    item: () => ({ record, size: elRef.current?.offsetWidth }),
    canDrag: !isOnPlayer,
    end: () => { draggedAtRef.current = Date.now(); },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [record, isOnPlayer]);

  // The rect is captured here, before any state changes, because loading the
  // record puts .on-player on this element in the same commit that mounts the
  // record on the player -- and that dimming is a 0.5s transition. Measuring
  // afterwards would catch the slot mid-fade. The flight has to start from
  // where the record actually looked when it was tapped.
  const handleSelect = () => {
    if (isOnPlayer || !onSelect) return;
    if (Date.now() - draggedAtRef.current < CLICK_AFTER_DRAG_MS) return;

    const el = elRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    onSelect(record, {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      width: rect.width,
    });
  };

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        drag(node);
      }}
      // RecordPlayer looks this up to find where an ejected record should fly
      // back to.
      data-record-id={record.id}
      className={`vinyl-record ${isDragging ? "dragging" : ""} ${isOnPlayer ? "on-player" : ""}`}
      style={{ background: record.color }}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      role="button"
      tabIndex={isOnPlayer ? -1 : 0}
      aria-label={`Play ${record.title}`}
    >
      <div className="vinyl-grooves"></div>
    </div>
  );
};

export default Vinyl;

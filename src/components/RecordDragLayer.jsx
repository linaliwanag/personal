import React from "react";
import { useDragLayer } from "react-dnd";
import "./RecordDragLayer.css";

// TouchBackend has no equivalent of the browser's native drag image, so without
// this nothing follows the finger on mobile -- the record would appear to stay
// put while you drag it. Only mounted on coarse-pointer devices; HTML5Backend
// draws its own ghost.
//
// The preview's size rides along on the drag item, measured off the real
// element at drag start, so it matches whatever size the current breakpoint
// renders without this component knowing anything about the breakpoints.
const RecordDragLayer = () => {
  const { isDragging, item, offset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    offset: monitor.getClientOffset(),
  }));

  if (!isDragging || !offset || !item?.record) return null;

  const size = item.size || 120;

  return (
    <div className="record-drag-layer">
      <div
        className="record-drag-preview"
        style={{
          width: size,
          height: size,
          background: item.record.color,
          transform: `translate(${offset.x}px, ${offset.y}px) translate(-50%, -50%)`,
        }}
      >
        <div className="vinyl-grooves"></div>
      </div>
    </div>
  );
};

export default RecordDragLayer;

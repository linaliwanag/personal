import React from "react";

import { findByCode, keypadLayout } from "./catalogue";

// The two-press selector: a letter bank, then a number. It is the authentic
// jukebox gesture and it is also the one place in this variant where it would
// be easy to break audio on iOS -- so the rule is spelled out here rather than
// left to whoever edits it next.
//
// The letter press changes nothing but a highlight. The *number* press is the
// real selection, and it calls straight through to onSelect, which calls
// onTapLoad, inside this click handler. No timer, no effect, no waiting for the
// gripper. The gripper takes three seconds to fetch the record and the sound
// starts immediately; that mismatch is the correct trade, because the
// alternative is a machine that looks right and plays nothing on a phone.
const Keypad = ({ catalogue, letter, onLetter, onSelect, onMiss, loadedId }) => {
  const { letters, numbers } = keypadLayout(catalogue.length);

  const press = (number, event) => {
    const entry = findByCode(catalogue, `${letter}${number}`);
    if (!entry) {
      onMiss(`${letter}${number}`);
      return;
    }
    onSelect(entry, event);
  };

  return (
    <div className="jb-keypad">
      <div className="jb-keyrow jb-keyrow--letters">
        {letters.map((value) => (
          <button
            key={value}
            type="button"
            className={`jb-key jb-key--letter ${value === letter ? "is-lit" : ""}`}
            onClick={() => onLetter(value)}
            aria-pressed={value === letter}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="jb-keyrow jb-keyrow--numbers">
        {numbers.map((number) => {
          const entry = findByCode(catalogue, `${letter}${number}`);
          return (
            <button
              key={number}
              type="button"
              className={`jb-key jb-key--number ${entry ? "" : "is-blank"} ${
                entry && entry.record.id === loadedId ? "is-playing" : ""
              }`}
              onClick={(event) => press(number, event)}
            >
              {number}
              <span className="jb-sr">
                {entry ? ` — play ${entry.record.title}` : " — no selection"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Keypad;

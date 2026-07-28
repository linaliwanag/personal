import React, { useCallback, useRef } from "react";

import { StudioStage } from "../studio";
import CrateBox from "../crate/CrateBox";
import "../crate/crate.css";
import "./studiocrate.css";

// Studio Crate: the Studio Deck, but you dig for the record instead of taking it
// off a rack.
//
// Deliberately thin. The deck, the tonearm, the flights, the transport and the
// liner-notes panel all come from ../studio unchanged -- this variant hands that
// stage a different record store through its `picker` prop. Nothing about the
// turntable is re-implemented here, so a fix to the arm or the platter lands in
// both variants at once.
//
// The crate is the same component Crate Digger uses (../crate/CrateBox), which
// is why digging, the filler sleeves, the dividers and the keyboard path all
// behave identically to that variant.
const Stage = (props) => {
  const { records, loaded, onTapLoad, isCoarsePointer } = props;
  const loadedId = loaded?.record.id ?? null;
  const crateRef = useRef(null);

  // Straight through, inside the crate's real click handler. The deck plays its
  // own arrival flight off the `loaded` change afterwards; nothing here is
  // allowed to defer the call, because iOS only unlocks audio inside the
  // gesture itself.
  const pull = useCallback(
    (record, el) => {
      // The record already on the platter has nothing to pull -- Crate Digger
      // turns the sleeve over at this point, but here the sleeve's back is not
      // what shows the notes: the liner panel beside the deck already has them.
      if (loadedId === record.id) return;

      const r = el.getBoundingClientRect();
      onTapLoad(record, {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        width: r.width,
      });
    },
    [loadedId, onTapLoad]
  );

  // `crate-tokens` is what makes the crate renderable outside Crate Digger's
  // own page: it carries --sw and the wood palette that every .crate- rule
  // resolves against. studiocrate.css then shrinks --sw to fit the deck's scene.
  const picker = (
    <div className="sc-crate crate-tokens">
      <CrateBox
        ref={crateRef}
        className="sc-crate-col"
        records={records}
        loadedId={loadedId}
        onPull={pull}
        isCoarsePointer={isCoarsePointer}
        flipOnDeck={false}
        label="Record crate. Use left and right arrow keys to dig through it."
      />
    </div>
  );

  return (
    <StudioStage
      {...props}
      picker={picker}
      copy={{
        hint: "Dig through the crate and pull a record out to start a side.",
        body: (
          <div>
            <p>
              The crate holds three of mine filed among the usual junk &mdash; who I am,
              what I&rsquo;ve built, and how to reach me. Drag across it, or use the
              arrows, and pull one out to cue it up.
            </p>
            <p>
              The arm is live &mdash; grab the headshell and swing it across the record to
              scrub. The fader pulls the platter off speed, and the strobe dots around the
              rim drift the moment it leaves 0.0.
            </p>
          </div>
        ),
      }}
    />
  );
};

export default Stage;

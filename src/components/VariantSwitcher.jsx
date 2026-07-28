import React, { useEffect, useRef, useState } from "react";
import "./VariantSwitcher.css";

// A custom listbox rather than a native <select>, because each option carries a
// tagline as well as a name and a native select can only show one line of text
// per option.
const VariantSwitcher = ({ variants, activeId, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = variants.find((v) => v.id === activeId) ?? variants[0];

  // Dismiss on anything that isn't a choice: a click elsewhere, Escape, or the
  // page scrolling out from under the popover.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="variant-switcher" ref={rootRef}>
      <button
        type="button"
        className={`variant-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="variant-trigger-label">Style</span>
        <span className="variant-trigger-name">{active.name}</span>
        <svg className="variant-caret" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <ul className="variant-menu" role="listbox" aria-label="Record player style">
          {variants.map((variant) => (
            <li key={variant.id}>
              <button
                type="button"
                role="option"
                aria-selected={variant.id === activeId}
                className={`variant-option ${variant.id === activeId ? "selected" : ""}`}
                onClick={() => choose(variant.id)}
              >
                <span className="variant-option-name">{variant.name}</span>
                <span className="variant-option-tagline">{variant.tagline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VariantSwitcher;

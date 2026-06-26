"use client";

import { ChevronDown, Check, LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SimpleSelectOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

type SimpleSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SimpleSelectOption[];
  placeholder: string;
  ariaLabel: string;
};

export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel
}: SimpleSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value]
  );

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const SelectedIcon = selectedOption?.icon;

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="simple-select" ref={wrapperRef}>
      <button
        type="button"
        className="simple-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
          }
        }}
      >
        <span className={selectedOption ? "simple-select-value" : "simple-select-placeholder"}>
          {SelectedIcon ? <SelectedIcon className="simple-select-option-icon" /> : null}
          <span>{selectedOption?.label ?? placeholder}</span>
        </span>
        <ChevronDown className={`simple-select-chevron ${open ? "simple-select-chevron-open" : ""}`} />
      </button>

      {open && (
        <div className="simple-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const highlighted = index === highlightedIndex;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`simple-select-option ${selected ? "simple-select-option-selected" : ""} ${
                  highlighted ? "simple-select-option-highlighted" : ""
                }`}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlightedIndex((index + 1) % options.length);
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlightedIndex((index - 1 + options.length) % options.length);
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onValueChange(option.value);
                    setOpen(false);
                  }
                }}
              >
                <span className="simple-select-option-label">
                  {OptionIcon ? <OptionIcon className="simple-select-option-icon" /> : null}
                  <span>{option.label}</span>
                </span>
                {selected ? <Check className="simple-select-check" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { ChevronDown, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SimpleSelectOption = {
  value: string;
  label: string;
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value]
  );

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

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

  function focusOption(index: number) {
    window.requestAnimationFrame(() => {
      optionRefs.current[index]?.focus();
    });
  }

  function openAndFocus(index: number) {
    setOpen(true);
    focusOption(index);
  }

  return (
    <div className="simple-select" ref={wrapperRef}>
      <button
        type="button"
        className="simple-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openAndFocus(selectedIndex >= 0 ? selectedIndex : 0);
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus(selectedIndex >= 0 ? selectedIndex : options.length - 1);
          }
        }}
      >
        <span className={selectedOption ? "simple-select-value" : "simple-select-placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={`simple-select-chevron ${open ? "simple-select-chevron-open" : ""}`} />
      </button>

      {open ? (
        <div className="simple-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                className={`simple-select-option ${selected ? "simple-select-option-selected" : ""}`}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption((index + 1) % options.length);
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption((index - 1 + options.length) % options.length);
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onValueChange(option.value);
                    setOpen(false);
                  }
                }}
              >
                <span>{option.label}</span>
                {selected ? <Check className="simple-select-check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

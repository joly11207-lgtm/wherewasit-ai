"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, LucideIcon } from "lucide-react";

export type PremiumSelectOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type PremiumSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: PremiumSelectOption[];
  placeholder: string;
  ariaLabel: string;
};

export function PremiumSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel
}: PremiumSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const SelectedIcon = selectedOption?.icon;

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="premium-select-trigger" aria-label={ariaLabel}>
        <span className="premium-select-trigger-value">
          {SelectedIcon ? <SelectedIcon className="premium-select-icon" /> : null}
          <span className={selectedOption ? "premium-select-text" : "premium-select-placeholder"}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <Select.Icon>
          <ChevronDown className="premium-select-chevron" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="premium-select-content" position="popper" sideOffset={8}>
          <Select.ScrollUpButton className="premium-select-scroll-button">
            <ChevronUp className="premium-select-chevron" />
          </Select.ScrollUpButton>

          <Select.Viewport className="premium-select-viewport">
            {options.map((option) => {
              const OptionIcon = option.icon;

              return (
                <Select.Item key={option.value} value={option.value} className="premium-select-item">
                  <Select.ItemText>
                    <span className="premium-select-item-row">
                      <OptionIcon className="premium-select-icon" />
                      <span>{option.label}</span>
                    </span>
                  </Select.ItemText>
                  <Select.ItemIndicator className="premium-select-item-indicator">
                    <Check className="premium-select-check" />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>

          <Select.ScrollDownButton className="premium-select-scroll-button">
            <ChevronDown className="premium-select-chevron" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

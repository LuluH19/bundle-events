"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconCheck } from "@/src/components/ui";

interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}

export function Dropdown<T extends string | number>({ label, value, options, onChange }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const current = options.find((o) => o.value === value);

  const openMenu = useCallback(() => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const commit = (index: number) => {
    onChange(options[index].value);
    close(true);
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
      case "Tab":
        e.preventDefault();
        close(true);
        break;
    }
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 ring-1 ring-line transition-colors hover:ring-ink/30"
      >
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        <span className="text-[13px] font-semibold text-ink">{current?.label}</span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[var(--dropdown-min,9rem)] overflow-hidden rounded-2xl bg-white p-1 shadow-[0_16px_40px_-12px_rgba(0,17,58,0.25)] ring-1 ring-line outline-none"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            const active = i === activeIndex;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors ${
                  selected
                    ? "bg-ember-soft font-semibold text-ember-ink"
                    : active
                      ? "bg-mist text-ink"
                      : "text-ink"
                }`}
              >
                {o.label}
                {selected && <IconCheck size={14} className="text-ember-ink" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

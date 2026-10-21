'use client';

import { useEffect, useRef } from 'react';

export type SelectOption = { value: string; label: string };

/**
 * Single-select lp-dropdown (canonical anatomy). Open/close, selection and Escape are owned
 * by lepidus.js; we only read the committed value from its `lp-dropdown-change` event.
 * Parents should pass `key={value}` so a new value remounts fresh, un-initialised markup.
 */
export function DropdownSelect({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // lepidus.js initialises markup present at load; markup mounted later needs an explicit init.
    window.Lepidus?.initDropdown(el);
    const handler = (event: Event) => {
      const option = (event as CustomEvent<{ option?: HTMLElement }>).detail?.option;
      const next = option?.dataset.value;
      if (next !== undefined) onChangeRef.current(next);
    };
    el.addEventListener('lp-dropdown-change', handler);
    return () => el.removeEventListener('lp-dropdown-change', handler);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="lp-dropdown" data-lp-dropdown="single">
      <button type="button" className="lp-dropdown__trigger" aria-expanded="false" aria-haspopup="listbox">
        <span className="lp-dropdown__trigger-label">{current?.label ?? placeholder}</span>
        <svg className="lp-dropdown__chevron" viewBox="0 0 12 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M1 1l5 4 5-4" />
        </svg>
      </button>
      <div className="lp-dropdown__panel" hidden>
        <div className="lp-dropdown__header">
          <span className="lp-dropdown__header-label">{placeholder}</span>
          <svg className="lp-dropdown__chevron lp-dropdown__chevron--open" viewBox="0 0 12 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l5 4 5-4" />
          </svg>
        </div>
        <div className="lp-dropdown__list" role="listbox" aria-label={placeholder}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="lp-dropdown__option"
              role="option"
              aria-checked={o.value === value}
              aria-selected={o.value === value}
              data-value={o.value}
            >
              <span className="lp-dropdown__option-label">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

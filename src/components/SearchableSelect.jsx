import React, { useMemo, useState } from 'react';
import './SearchableSelect.css';

/**
 * SearchableSelect component.
 * Reusable dropdown with search input and scrollable list.
 */
const SearchableSelect = ({ placeholder, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => String(opt.value) === String(value));
    return found ? found.label : '';
  }, [options, value]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const lower = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, query]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="ss-container">
      <button
        type="button"
        className="ss-control"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selectedLabel ? 'ss-value' : 'ss-placeholder'}>
          {selectedLabel || placeholder}
        </span>
        <span className="ss-arrow">▾</span>
      </button>
      {open && (
        <>
          <div className="ss-menu">
            <div className="ss-search-wrapper">
              <input
                className="ss-search"
                placeholder="Search by name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="ss-options">
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="ss-option"
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="ss-empty">No results</div>
              )}
            </div>
          </div>
          <div className="ss-backdrop" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
};

export default SearchableSelect;


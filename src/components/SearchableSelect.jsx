import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SearchableSelect.css';

/**
 * SearchableSelect component.
 * Reusable dropdown with search input and scrollable list.
 */
const SearchableSelect = ({ placeholder, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => String(opt.value) === String(value));
    return found ? found.label : '';
  }, [options, value]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    const results = options.filter((opt) => 
      opt && opt.label && String(opt.label).toLowerCase().includes(lower)
    );
    return results;
  }, [options, query]);

  const visibleOptions = useMemo(() => filtered.slice(0, 100), [filtered]);
  const hasMore = filtered.length > 100;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      
      setMenuStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        minWidth: isMobile ? '280px' : 'auto',
        zIndex: 20000,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  // Close on scroll or resize to keep position sync (v1)
  useEffect(() => {
    if (!open) return;
    const handleUpdate = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMenuStyle(prev => ({
          ...prev,
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
        }));
      }
    };
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [open]);

  return (
    <div className="ss-container" ref={containerRef}>
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
      {open && createPortal(
        <>
          <div className="ss-menu ss-portal-menu" style={menuStyle}>
            <div className="ss-search-wrapper">
              <input
                ref={inputRef}
                className="ss-search"
                placeholder="Search by name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="ss-options">
              {visibleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="ss-option"
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
              {hasMore && (
                <div className="ss-more">... Too many results, keep typing to refine</div>
              )}
              {filtered.length === 0 && (
                <div className="ss-empty">No results</div>
              )}
            </div>
          </div>
          <div className="ss-backdrop" onClick={() => setOpen(false)} />
        </>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;


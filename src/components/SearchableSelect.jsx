import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SearchableSelect.css';

/**
 * SearchableSelect component.
 * Reusable dropdown with search input and scrollable list.
 */
const SearchableSelect = ({ placeholder, options = [], value, onChange, onSelect, small, defaultValue, className }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => String(opt.value) === String(value));
    if (found) return found.label;
    return defaultValue || '';
  }, [options, value, defaultValue]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    const results = options.filter((opt) => 
      opt && opt.label && String(opt.label).toLowerCase().includes(lower)
    );
    return results;
  }, [options, query]);

  const visibleOptions = useMemo(() => filtered.slice(0, 100), [filtered]);
  const hasMore = filtered.length > 100;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleSelect = (opt) => {
    onChange(opt.value, opt);
    if (onSelect) onSelect(opt.value, opt);
    setOpen(false);
    setFocusedIndex(0);
  };

  useEffect(() => {
    setFocusedIndex(0);
  }, [query, open]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % visibleOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + visibleOptions.length) % visibleOptions.length);
    } else if (e.key === 'Tab') {
      // By default, Tab should select the current highlighted item and move to the next field
      if (visibleOptions[focusedIndex]) {
        // We don't preventDefault() here to allow the focus to naturally move to the next input field in the page layout (v4)
        handleSelect(visibleOptions[focusedIndex]);
      }
    } else if (e.key === 'Enter') {
      if (visibleOptions[focusedIndex]) {
        e.preventDefault();
        handleSelect(visibleOptions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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

  // Handle scrolling of focused item into view (CONTAINER ONLY, avoid page scroll)
  useEffect(() => {
    if (open && scrollRef.current) {
      const focusedEl = scrollRef.current.querySelector(`.ss-option.focused`);
      if (focusedEl) {
        const container = scrollRef.current;
        const itemTop = focusedEl.offsetTop;
        const itemBottom = itemTop + focusedEl.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (itemTop < containerTop) {
          container.scrollTop = itemTop;
        } else if (itemBottom > containerBottom) {
          container.scrollTop = itemBottom - container.offsetHeight;
        }
      }
    }
  }, [focusedIndex, open]);

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
    <div className={`ss-container ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        className={`ss-control ${small ? 'ss-small' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
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
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="ss-options" ref={scrollRef}>
              {visibleOptions.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`ss-option ${idx === focusedIndex ? 'focused' : ''}`}
                  onClick={() => handleSelect(opt)}
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


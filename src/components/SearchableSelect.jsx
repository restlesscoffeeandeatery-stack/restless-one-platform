import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

const SearchableSelect = ({ id, value, onChange, options, placeholder = 'Cari dan pilih...', required = false, ariaLabel }) => {
  const generatedId = useId();
  const inputId = id || `searchable-select-${generatedId}`;
  const listboxId = `${inputId}-options`;
  const selected = options.find(option => option.value === value);
  const [query, setQuery] = useState(selected?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current && !value) {
      isTypingRef.current = false;
      return;
    }
    setQuery(selected?.label || '');
  }, [selected?.label, value]);

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('id-ID');
    if (!keyword || selected?.label === query) return options;
    return options.filter(option => `${option.label} ${option.meta || ''}`.toLocaleLowerCase('id-ID').includes(keyword));
  }, [options, query, selected?.label]);

  const chooseOption = option => {
    isTypingRef.current = false;
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleChange = event => {
    const nextQuery = event.target.value;
    isTypingRef.current = true;
    setQuery(nextQuery);
    if (!selected || nextQuery !== selected.label) onChange('');
    setActiveIndex(0);
    setIsOpen(true);
  };

  const handleKeyDown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(index => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
      event.preventDefault();
      chooseOption(filteredOptions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setQuery(selected?.label || '');
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      const exact = options.find(option => option.label.toLocaleLowerCase('id-ID') === query.trim().toLocaleLowerCase('id-ID'));
      if (exact) chooseOption(exact);
      else if (!value) setQuery('');
      setIsOpen(false);
    }, 0);
  };

  return (
    <div className="searchable-select">
      <Search size={15} className="searchable-select-search" aria-hidden="true" />
      <input
        id={inputId}
        type="text"
        className="form-control searchable-select-input"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${inputId}-option-${activeIndex}` : undefined}
        aria-invalid={Boolean(query && !value)}
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        value={query}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <ChevronDown size={15} className="searchable-select-chevron" aria-hidden="true" />
      {isOpen && (
        <div id={listboxId} className="searchable-select-menu" role="listbox" aria-label={ariaLabel}>
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              id={`${inputId}-option-${index}`}
              key={option.value}
              type="button"
              className={`searchable-select-option ${index === activeIndex ? 'active' : ''}`}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              <span><strong>{option.label}</strong>{option.meta && <small>{option.meta}</small>}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          )) : <div className="searchable-select-empty">Material tidak ditemukan</div>}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

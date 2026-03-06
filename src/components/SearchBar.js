import React, { useState } from 'react';
import { matchesSearch } from '../utils/treeUtils';

export default function SearchBar({ value, onChange, onHighlight, treeData }) {
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (e) => {
    const term = e.target.value;
    onChange(term);
    onHighlight(null);

    if (term.length >= 2) {
      const matches = treeData
        .filter(rec => matchesSearch(rec, term) && !rec.is_waiting)
        .slice(0, 8);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (rec) => {
    onChange(rec.process_name || String(rec.process_id));
    onHighlight(String(rec.process_id));
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange('');
    onHighlight(null);
    setSuggestions([]);
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-input-row">
        <span className="search-icon">&#128269;</span>
        <input
          className="search-input"
          type="text"
          placeholder="Buscar proceso, producto o ID..."
          value={value}
          onChange={handleChange}
        />
        {value && (
          <button className="search-clear" onClick={handleClear} title="Limpiar">&#10005;</button>
        )}
      </div>
      {suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((rec, i) => (
            <li key={i} className="search-suggestion-item" onClick={() => handleSelect(rec)}>
              <span className="sug-id">#{rec.process_id}</span>
              <span className="sug-name">{rec.process_name}</span>
              {rec.product && <span className="sug-product">{rec.product}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

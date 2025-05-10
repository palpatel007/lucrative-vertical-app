import React, { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { value: 'cz', label: 'Czech', flag: '🇨🇿' },
  { value: 'dk', label: 'Danish', flag: '🇩🇰' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { value: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { value: 'pl', label: 'Polish', flag: '🇵🇱' },
  { value: 'pt', label: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { value: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { value: 'se', label: 'Swedish', flag: '🇸🇪' },
  { value: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { value: 'th', label: 'Thai', flag: '🇹🇭' },
  { value: 'jp', label: 'Japanese', flag: '🇯🇵' },
  { value: 'zh-CN', label: 'Chinese (Simplified)', flag: '🇨🇳' },
  { value: 'zh-TW', label: 'Chinese (Traditional)', flag: '🇨🇳' },
  { value: 'kr', label: 'Korean', flag: '🇰🇷' },
];

export default function LanguageDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = LANGUAGES.find(l => l.value === value) || LANGUAGES[0];

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 140, fontSize: 15 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: '#fff',
          border: '1px solid #ECECEC',
          borderRadius: 12,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          fontWeight: 500,
          color: '#202223',
          cursor: 'pointer',
          justifyContent: 'space-between',
          boxShadow: open ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{selected.flag}</span> {selected.label}
        </span>
        <span style={{ fontSize: 16, color: '#8C9196', marginLeft: 8 }}>&#9662;</span>
      </button>
      {open && (
        <ul
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            width: '100%',
            background: '#fff',
            border: '1px solid #ECECEC',
            borderRadius: 12,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 100,
          }}
        >
          {LANGUAGES.map(lang => (
            <li
              key={lang.value}
              onClick={() => { onChange(lang.value); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                cursor: 'pointer',
                background: value === lang.value ? '#F6F6F7' : 'transparent',
                fontWeight: value === lang.value ? 600 : 400,
                color: '#202223',
                borderRadius: 8,
                margin: '2px 6px',
                position: 'relative',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F6F6F7'}
              onMouseLeave={e => e.currentTarget.style.background = value === lang.value ? '#F6F6F7' : 'transparent'}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {value === lang.value && (
                <span style={{ position: 'absolute', right: 12, fontSize: 16, color: '#3574F2' }}>&#10003;</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 
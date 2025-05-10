import React, { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({ options, value, onChange, icon }) {
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

  const selected = options.find(o => o.value === value) || options[0];

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
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          {selected.label}
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
          {options.map(opt => (
            <li
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                cursor: 'pointer',
                background: value === opt.value ? '#F6F6F7' : 'transparent',
                fontWeight: value === opt.value ? 600 : 400,
                color: '#202223',
                borderRadius: 8,
                margin: '2px 6px',
                position: 'relative',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F6F6F7'}
              onMouseLeave={e => e.currentTarget.style.background = value === opt.value ? '#F6F6F7' : 'transparent'}
            >
              <span>{opt.label}</span>
              {value === opt.value && (
                <span style={{ position: 'absolute', right: 12, fontSize: 16, color: '#3574F2' }}>&#10003;</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 
export function Mascot() {
  return (
    <div className="mascot" aria-hidden="true">
      <svg viewBox="0 0 200 180" width="200" height="180">
        <ellipse cx="100" cy="166" rx="54" ry="8" fill="#E4D3BC" />
        <g className="heart">
          <path d="M156 28c0-6 8-6 8 0 0-6 8-6 8 0 0 8-8 14-8 14s-8-6-8-14z" fill="#8A5A1E" />
        </g>
        <g className="arm">
          <rect x="108" y="108" width="46" height="16" rx="8" fill="#C4894A" />
        </g>
        <rect x="52" y="92" width="78" height="62" rx="30" fill="#8A5A1E" />
        <circle cx="148" cy="108" r="16" fill="#F6D3B0" />
        <ellipse cx="150" cy="126" rx="20" ry="14" fill="#3E6B35" />
        <g className="child-face">
          <circle cx="143" cy="106" r="1.6" fill="#1E140B" />
          <circle cx="153" cy="106" r="1.6" fill="#1E140B" />
          <path d="M144 112q4 4 8 0" fill="none" stroke="#1E140B" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <circle cx="108" cy="42" r="13" fill="#3E2A1A" />
        <ellipse cx="86" cy="48" rx="28" ry="16" fill="#3E2A1A" />
        <circle cx="84" cy="64" r="28" fill="#F0C9A0" />
        <g className="eyes">
          <circle cx="74" cy="62" r="2.4" fill="#1E140B" />
          <circle cx="94" cy="62" r="2.4" fill="#1E140B" />
        </g>
        <path d="M74 74q10 8 20 0" fill="none" stroke="#1E140B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

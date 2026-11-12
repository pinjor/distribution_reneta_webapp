/** Lightweight SVG — pharmaceutical warehouse / supply-chain motif (not clinical care). */
export function WarehouseLoginVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="wmsShelf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ac6df" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2a8aa0" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="wmsBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ac6df" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4ab8d4" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Floor plane */}
      <path
        d="M40 292 L280 220 L520 292 L280 360 Z"
        fill="#6ac6df"
        fillOpacity="0.06"
        stroke="#6ac6df"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />

      {/* Back wall grid */}
      <g stroke="#6ac6df" strokeOpacity="0.18" strokeWidth="1">
        <path d="M90 80 V250" />
        <path d="M160 68 V238" />
        <path d="M230 58 V228" />
        <path d="M300 58 V228" />
        <path d="M370 68 V238" />
        <path d="M440 80 V250" />
        <path d="M90 120 H440" />
        <path d="M90 170 H440" />
        <path d="M90 220 H440" />
      </g>

      {/* Racking frame */}
      <rect x="110" y="70" width="320" height="190" rx="8" stroke="#9ad9ea" strokeOpacity="0.45" strokeWidth="2" fill="url(#wmsShelf)" />
      <path d="M110 135 H430 M110 200 H430" stroke="#9ad9ea" strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Medicine cartons */}
      <g>
        <rect x="130" y="88" width="52" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="192" y="88" width="52" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="254" y="88" width="52" height="36" rx="4" fill="#ffffff" fillOpacity="0.08" stroke="#6ac6df" strokeOpacity="0.4" />
        <rect x="316" y="88" width="52" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />

        <rect x="130" y="152" width="52" height="36" rx="4" fill="#ffffff" fillOpacity="0.08" stroke="#6ac6df" strokeOpacity="0.4" />
        <rect x="192" y="152" width="52" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="254" y="152" width="52" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="316" y="152" width="70" height="36" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />

        <rect x="148" y="218" width="70" height="30" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="230" y="218" width="52" height="30" rx="4" fill="#ffffff" fillOpacity="0.08" stroke="#6ac6df" strokeOpacity="0.4" />
        <rect x="294" y="218" width="90" height="30" rx="4" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
      </g>

      {/* Batch label marks */}
      <g stroke="#eef8fb" strokeOpacity="0.55" strokeWidth="1.5">
        <path d="M142 100 H162" />
        <path d="M204 100 H224" />
        <path d="M328 100 H348" />
        <path d="M204 164 H224" />
        <path d="M266 164 H286" />
        <path d="M160 230 H188" />
      </g>

      {/* Pallet / dispatch unit */}
      <g transform="translate(420 210)">
        <rect x="0" y="28" width="88" height="10" rx="2" fill="#6ac6df" fillOpacity="0.25" stroke="#6ac6df" strokeOpacity="0.45" />
        <rect x="10" y="0" width="28" height="28" rx="3" fill="url(#wmsBox)" stroke="#6ac6df" strokeOpacity="0.5" />
        <rect x="42" y="0" width="28" height="28" rx="3" fill="#ffffff" fillOpacity="0.1" stroke="#6ac6df" strokeOpacity="0.45" />
        <circle cx="18" cy="44" r="4" fill="#4ab8d4" fillOpacity="0.5" />
        <circle cx="70" cy="44" r="4" fill="#4ab8d4" fillOpacity="0.5" />
      </g>

      {/* Route arc */}
      <path
        d="M70 260 C140 200, 220 300, 310 250 C380 210, 430 270, 500 240"
        stroke="#6ac6df"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="6 8"
        fill="none"
      />
      <circle cx="70" cy="260" r="5" fill="#6ac6df" fillOpacity="0.55" />
      <circle cx="500" cy="240" r="5" fill="#4ab8d4" fillOpacity="0.7" />
    </svg>
  );
}

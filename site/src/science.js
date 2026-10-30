// Decorative vector diagrams: no external images or fonts required.
export function orbitMap() {
  return `<svg class="orbit-map" viewBox="0 0 540 420" fill="none" aria-hidden="true">
  <defs><radialGradient id="orb-glow"><stop stop-color="#8bcce2" stop-opacity=".16"/><stop offset="1" stop-color="#8bcce2" stop-opacity="0"/></radialGradient></defs>
  <circle cx="270" cy="210" r="200" fill="url(#orb-glow)"/>
  <g stroke="currentColor" stroke-width=".7" opacity=".25"><path d="M40 210H500M270 20V400"/><circle cx="270" cy="210" r="166" stroke-dasharray="2 7"/><circle cx="270" cy="210" r="113"/><path d="M64 65L476 355M64 355L476 65" stroke-dasharray="3 8"/></g>
  <g stroke="currentColor"><ellipse cx="270" cy="210" rx="218" ry="76" transform="rotate(-29 270 210)" opacity=".6"/><ellipse cx="270" cy="210" rx="165" ry="61" transform="rotate(46 270 210)" opacity=".3"/><circle cx="270" cy="210" r="51" stroke-width=".6" opacity=".6"/></g>
  <circle cx="270" cy="210" r="29" fill="#0d192b" stroke="#c7e8f5"/>
  <path d="M242 210H298M270 182C250 200 250 220 270 238M270 182C290 200 290 220 270 238" stroke="#8bcce2" opacity=".6"/>
  <g fill="#d6edf7"><circle cx="421" cy="87" r="4"/><circle cx="148" cy="123" r="3"/><circle cx="170" cy="299" r="3"/><circle cx="92" cy="241" r="2"/><circle cx="465" cy="303" r="1.5"/><circle cx="337" cy="49" r="1.5"/></g>
  <g stroke="#d9bd81"><path d="M421 76V98M410 87H432" opacity=".7"/><circle cx="421" cy="87" r="11" opacity=".3"/></g>
  <g fill="currentColor" font-family="Consolas,monospace" font-size="10" letter-spacing="1.5"><text x="312" y="201">r(t)</text><text x="434" y="72">α</text><text x="68" y="369">CELESTIAL MECHANICS</text><text x="346" y="388" opacity=".55">φ = ωt + φ₀</text><text x="275" y="30" opacity=".55">N</text></g>
  </svg>`;
}

export const disciplines = {
  astro1: { name: 'ASTROPHYSICS', formula: 'Iν · Fν · Lν', icon: '<circle cx="28" cy="28" r="10"/><ellipse cx="28" cy="28" rx="24" ry="8" transform="rotate(-30 28 28)"/><circle cx="46" cy="15" r="2" fill="currentColor"/>' },
  emwaves: { name: 'ELECTRODYNAMICS', formula: '∇ × E = −∂B/∂t', icon: '<path d="M3 28C11 0 17 0 28 28S45 56 53 28M3 28C11 56 17 56 28 28S45 0 53 28"/><path d="M2 28H54" opacity=".3"/>' },
  advmech: { name: 'CLASSICAL MECHANICS', formula: 'dL/dt = τ', icon: '<path d="M28 5V28L44 45M12 5H44"/><path d="M10 43A26 26 0 0 0 47 43" stroke-dasharray="2 4"/><circle cx="44" cy="45" r="5" fill="currentColor"/><circle cx="28" cy="28" r="2"/>' },
};

export function disciplineIcon(slug) {
  return `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${disciplines[slug]?.icon || disciplines.astro1.icon}</svg>`;
}

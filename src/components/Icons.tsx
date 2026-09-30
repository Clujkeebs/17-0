// Custom SVG icon set. Stroke-based, 1.75px, square caps. No third-party icon libraries.
type P = { size?: number; title?: string; className?: string };
const base = (size = 20, title?: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'square' as const, 'aria-hidden': title ? undefined : true, role: title ? 'img' : undefined,
});
/** Brand mark: a goalpost that doubles as the U, with the ball splitting the uprights. */
export const LogoMark = ({ size = 22, title }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>{title && <title>{title}</title>}
    <rect width="24" height="24" rx="6.5" fill="currentColor" />
    <path d="M7.4 4.6 V10.6 Q7.4 14.2 11 14.2 H13 Q16.6 14.2 16.6 10.6 V4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 14.2 V19.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <g transform="rotate(-32 12 8.4)"><ellipse cx="12" cy="8.4" rx="2.5" ry="1.55" fill="#E11D2E" /><path d="M10.9 8.4 H13.1" stroke="#fff" strokeWidth=".6" strokeLinecap="round" /></g>
  </svg>
);
export const ReelIcon = ({ size, title }: P) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<rect x="3" y="4" width="18" height="16" /><path d="M9 4 V20 M15 4 V20" /><path d="M3 12 H21" strokeDasharray="2 2" /></svg>);
export const ShareIcon = ({ size, title }: P) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<path d="M12 15 V3 M7 8 L12 3 L17 8" /><path d="M4 13 V21 H20 V13" /></svg>);
export const CheckIcon = ({ size, title }: P) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<path d="M4 12 L10 18 L20 6" /></svg>);
export const CloseIcon = ({ size, title }: P) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<path d="M5 5 L19 19 M19 5 L5 19" /></svg>);
export const ArrowIcon = ({ size, title }: P) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<path d="M4 12 H19 M13 6 L19 12 L13 18" /></svg>);
export const SoundIcon = ({ size, title, on }: P & { on?: boolean }) => (<svg {...base(size, title)}>{title && <title>{title}</title>}<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />{on ? <path d="M16 9 Q18 12 16 15 M18.5 7 Q22 12 18.5 17" /> : <path d="M16 9 L22 15 M22 9 L16 15" />}</svg>);

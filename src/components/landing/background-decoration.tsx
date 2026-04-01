/**
 * Subtle decorative SVG elements positioned absolutely behind the landing page content.
 * Concentric circles (top-right) and diagonal lines (bottom-left) add texture
 * without competing with the typography.
 */
export function BackgroundDecoration() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Top-right — concentric circles */}
      <svg
        className="absolute -right-20 -top-20 h-[420px] w-[420px] opacity-[0.45]"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="200" cy="200" r="60" stroke="#e5e7eb" strokeWidth="1" />
        <circle cx="200" cy="200" r="100" stroke="#e5e7eb" strokeWidth="0.75" />
        <circle cx="200" cy="200" r="150" stroke="#f3f4f6" strokeWidth="0.75" />
        <circle cx="200" cy="200" r="190" stroke="#f3f4f6" strokeWidth="0.5" />
        {/* Small orange arc accent on the inner circle */}
        <path
          d="M 200 140 A 60 60 0 0 1 255 175"
          stroke="hsl(24.6, 95%, 53.1%)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />
      </svg>

      {/* Bottom-left — diagonal parallel lines */}
      <svg
        className="absolute -bottom-16 -left-16 h-[320px] w-[320px] opacity-[0.35]"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="0" y1="300" x2="300" y2="0" stroke="#e5e7eb" strokeWidth="0.75" />
        <line x1="0" y1="260" x2="260" y2="0" stroke="#e5e7eb" strokeWidth="0.75" />
        <line x1="0" y1="220" x2="220" y2="0" stroke="#f3f4f6" strokeWidth="0.75" />
        <line x1="0" y1="180" x2="180" y2="0" stroke="#f3f4f6" strokeWidth="0.5" />
        <line x1="0" y1="140" x2="140" y2="0" stroke="#f3f4f6" strokeWidth="0.5" />
      </svg>

      {/* Small orange dot — mid-left area */}
      <div
        className="absolute left-[12%] top-[30%] h-2 w-2 rounded-full opacity-30"
        style={{ backgroundColor: 'hsl(24.6, 95%, 53.1%)' }}
      />
    </div>
  )
}

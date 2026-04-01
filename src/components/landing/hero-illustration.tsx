/**
 * Hero illustration for the landing page — undraw "Conference Speaker"
 * with brand-orange accents. Loaded as a static image from public/.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/illustrations/conference-speaker.svg"
      alt=""
      aria-hidden="true"
      className={className}
      width={400}
      height={400}
    />
  )
}

interface AtgWordmarkProps {
  /** Visual scale. `lg` is for the opening/login composition, `sm` for dense chrome. */
  size?: 'sm' | 'md' | 'lg';
  /** Shows the "Your personal job application team." line beneath the wordmark. */
  withTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
} as const;

/**
 * The ATG Apply wordmark: text only, "ATG" near-black and "Apply" orange.
 *
 * Replaces the boxed-"A" PNG that used to sit beside the words in the header,
 * sidebar and marketing chrome. That mark is deliberately gone — the brand is
 * the two words, and a raster logo also meant every surface shipped a bitmap
 * that could not follow the type size or the text colour.
 *
 * Rendered as a single element with a `title`-style accessible name so screen
 * readers announce "ATG Apply" once, rather than two adjacent text fragments.
 */
export default function AtgWordmark({ size = 'md', withTagline = false, className = '' }: AtgWordmarkProps) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className={`font-semibold tracking-tight ${SIZES[size]}`} aria-label="ATG Apply">
        <span className="text-[#1D1D1F]">ATG</span>
        <span className="text-[#F05A28] ml-1.5">Apply</span>
      </span>
      {withTagline && (
        <span className="mt-1.5 text-[11px] font-medium tracking-wide text-[#6E6E73]">
          Your personal job application team.
        </span>
      )}
    </span>
  );
}

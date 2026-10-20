import clsx from 'clsx';

interface IconProps {
  /** Material Symbols Outlined name, e.g. "add", "request_quote". */
  name: string;
  filled?: boolean;
  /** Pixel size; defaults to 20 (the Stitch default). */
  size?: number;
  className?: string;
  label?: string;
}

/** Material Symbols icon, as used throughout the Stitch designs. Decorative unless `label` is set. */
export function Icon({ name, filled, size = 20, className, label }: IconProps) {
  return (
    <span
      className={clsx('material-symbols-outlined shrink-0', filled && 'fill-icon', className)}
      style={{ fontSize: size, width: size, height: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

import clsx from 'clsx';
import logo from '@/assets/brand/procura-logo.png';

/** The original Procura logo (from the Stitch project, unmodified). */
export function Logo({ className }: { className?: string }) {
  return <img src={logo} alt="Procura" className={clsx('h-8 w-auto object-contain', className)} />;
}

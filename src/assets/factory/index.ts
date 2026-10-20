import corrugatingLine2 from './corrugating-line-2.jpg';
import corrugatingLine from './corrugating-line.jpg';
import flexoPress2 from './flexo-press-2.jpg';
import flexoPress from './flexo-press.jpg';
import qcLab2 from './qc-lab-2.jpg';
import qcLab from './qc-lab.jpg';
import warehouse2 from './warehouse-2.jpg';
import warehouse from './warehouse.jpg';

/** Factory photos exported from the Stitch designs (SUP-05 / SUP-05b), keyed by `FactoryPhoto.imageKey`. */
export const factoryImages: Record<string, string> = {
  'corrugating-line': corrugatingLine,
  'flexo-press': flexoPress,
  'qc-lab': qcLab,
  warehouse,
  'corrugating-line-2': corrugatingLine2,
  'flexo-press-2': flexoPress2,
  'qc-lab-2': qcLab2,
  'warehouse-2': warehouse2,
};

export function factoryImage(key: string): string {
  return factoryImages[key] ?? corrugatingLine;
}

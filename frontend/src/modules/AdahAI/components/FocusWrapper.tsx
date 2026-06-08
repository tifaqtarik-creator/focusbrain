/**
 * FocusWrapper.tsx — HOC Anti-distraction TDAH
 * Masque les éléments périphériques quand le focus mode est actif
 */
import { useEffect } from 'react';
import { useAdahStore } from '../store/adahStore';

interface Props {
  children: React.ReactNode;
  active: boolean;
}

export default function FocusWrapper({ children, active }: Props) {
  useEffect(() => {
    if (active) {
      document.body.classList.add('adah-focus-mode');
    } else {
      document.body.classList.remove('adah-focus-mode');
    }
    return () => document.body.classList.remove('adah-focus-mode');
  }, [active]);

  return <>{children}</>;
}

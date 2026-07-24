import type { IconName } from './icon.types';

export interface NavLink {
  label: string;
  to: string;
  icon: IconName;
  i18nKey?: string;
}

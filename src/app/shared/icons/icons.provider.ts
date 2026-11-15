import { provideIcons } from '@ng-icons/core';

import {
  lucideMail,
  lucideLockKeyhole,
  lucideArrowRight,
  lucideUserRound,
  lucideHouse,
  lucideSettings,
  lucideLogOut,
  lucideEye,
  lucideEyeOff,
  lucideMailCheck,
} from '@ng-icons/lucide';

export const provideAppIcons = () =>
  provideIcons({
    lucideMail,
    lucideLockKeyhole,
    lucideArrowRight,
    lucideUserRound,
    lucideHouse,
    lucideSettings,
    lucideLogOut,
    lucideEye,
    lucideEyeOff,
    lucideMailCheck,
  });

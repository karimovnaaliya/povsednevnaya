// Small SM-2 style spaced repetition. Items: {due:'YYYY-MM-DD', iv:days, ef, n}
import { dayKey, addDays, todayKey } from './time.js';

export function next(item, quality) {
  // quality: 0 (wrong) .. 5 (perfect)
  const it = item ? { ...item } : { iv: 0, ef: 2.5, n: 0 };
  if (quality < 3) { it.n = 0; it.iv = 1; }
  else {
    it.n += 1;
    it.iv = it.n === 1 ? 1 : it.n === 2 ? 3 : Math.round(it.iv * it.ef);
    it.ef = Math.max(1.3, it.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  it.iv = Math.min(it.iv, 120);
  it.due = dayKey(addDays(new Date(), it.iv));
  return it;
}
export const isDue = it => !!it && (it.due || '') <= todayKey();

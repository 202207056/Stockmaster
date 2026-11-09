export const MIN_SEED_AMOUNT = 100000;
export const MAX_SEED_AMOUNT = 100000000;
export const SEED_PRESETS = [1000000, 10000000, 100000000];
export function validSeedAmount(amount) {
  const value = Number(amount);
  return /^\d+$/.test(amount) && Number.isSafeInteger(value) && value >= MIN_SEED_AMOUNT && value <= MAX_SEED_AMOUNT;
}
export function addSeedAmount(amount, increment) {
  const value = Number(amount || 0);
  if (!Number.isSafeInteger(value) || value < 0 || !SEED_PRESETS.includes(increment) || value + increment > MAX_SEED_AMOUNT) return amount;
  return String(value + increment);
}

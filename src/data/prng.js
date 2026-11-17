/**
 * Seeded Pseudo-Random Number Generator (PRNG)
 * 
 * NOTE: All depot names, inventory numbers, parameters, and time-series
 * data in this project are illustrative and synthetic for academic research.
 * 
 * Uses Mulberry32: a 32-bit PRNG with deterministic reproducibility across runs.
 * Seed default: 19711216 (Commemorative date: 16 December 1971 - Vijay Diwas)
 */

export const DEFAULT_SEED = 19711216;

/**
 * Creates a mulberry32 PRNG instance.
 * @param {number} seed - Integer seed
 * @returns {() => number} Function returning a float in [0, 1)
 */
export function createRNG(seed = DEFAULT_SEED) {
  let s = seed >>> 0;
  return function mulberry32() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a random float in [min, max) using provided RNG.
 */
export function seededFloat(rng, min, max) {
  return min + (max - min) * rng();
}

/**
 * Generates a random integer in [min, max] using provided RNG.
 */
export function seededInt(rng, min, max) {
  return Math.floor(min + (max - min + 1) * rng());
}

/**
 * Generates standard Gaussian distributed random numbers using the Box-Muller transform.
 * @param {() => number} rng - Seeded uniform generator
 * @param {number} mean - Mean value
 * @param {number} stdDev - Standard deviation
 * @returns {number}
 */
export function boxMuller(rng, mean = 0, stdDev = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

import { generateAlgorithmicSheetMusic } from "./services/algorithmicService.ts";

const ITERATIONS = 10000;
const PINNED_KEY = "C Major";

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const coldStart = performance.now();
generateAlgorithmicSheetMusic(5, "Random");
const coldEnd = performance.now();

// Warm the internal caches and pin the key so the timed loop reflects steady-state cost.
generateAlgorithmicSheetMusic(5, PINNED_KEY);

const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
  generateAlgorithmicSheetMusic(5, PINNED_KEY);
}

const end = performance.now();

console.log(`Cold-start time: ${(coldEnd - coldStart).toFixed(2)}ms`);
console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
console.log(
  `Average time per generation: ${((end - start) / ITERATIONS).toFixed(3)}ms`,
);

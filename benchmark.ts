import { generateAlgorithmicSheetMusic } from "./services/algorithmicService.ts";

const ITERATIONS = 10000;

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
  generateAlgorithmicSheetMusic(5, "Random");
}

const end = performance.now();

console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
console.log(`Average time per generation: ${((end - start) / ITERATIONS).toFixed(3)}ms`);

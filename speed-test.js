// Speed test script to measure processing time
console.time('Random Number Generation');

// Start with timestamp
const startTime = new Date();
console.log(`Starting random number generation at: ${startTime.toISOString()}`);

// Generate 100 random numbers between 1 and 1000
const randomNumbers = [];
for (let i = 1; i <= 100; i++) {
  const randomNum = Math.floor(Math.random() * 1000) + 1;
  randomNumbers.push(randomNum);
  console.log(`${i}. ${randomNum}`);
}

// End with timestamp
const endTime = new Date();
console.log(`Finished random number generation at: ${endTime.toISOString()}`);

// Calculate and display execution time
const executionTimeMs = endTime - startTime;
console.log(`\nExecution time: ${executionTimeMs} milliseconds`);
console.log(`Average time per number: ${(executionTimeMs / 100).toFixed(2)} milliseconds`);

console.timeEnd('Random Number Generation');

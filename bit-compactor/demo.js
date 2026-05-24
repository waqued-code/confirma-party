'use strict';

const {
  compact,
  expand,
  MIN_SINGLE_LENGTH,
  MIN_PAIRED_TOTAL_LENGTH,
  SINGLE_REF_BITS,
  PAIRED_REF_BITS,
} = require('./compactor');

function runCase(name, input) {
  const { compacted, stats } = compact(input);
  const restored = expand(compacted);
  const ok = Buffer.compare(input, restored) === 0;
  const ratio = ((compacted.length / input.length) * 100).toFixed(2);
  console.log(`\n[${name}]`);
  console.log(`  entrada:    ${input.length} bytes (${stats.originalBits} bits)`);
  console.log(`  compactado: ${compacted.length} bytes (${ratio}%)`);
  console.log(
    `  tokens:     ${stats.literals} literais, ${stats.singleRefs} refs simples, ${stats.pairedRefs} refs pareadas`,
  );
  console.log(
    `  economia:   ${stats.savedBySingles} bits (simples) + ${stats.savedByPaired} bits (pareadas)`,
  );
  console.log(`  round-trip: ${ok ? 'OK' : 'FALHOU'}`);
  if (!ok) process.exitCode = 1;
}

console.log(`Threshold ref simples: length >= ${MIN_SINGLE_LENGTH} (custa ${SINGLE_REF_BITS} bits)`);
console.log(`Threshold ref pareada: L1+L2 >= ${MIN_PAIRED_TOTAL_LENGTH} (custa ${PAIRED_REF_BITS} bits)`);

runCase(
  'texto muito repetitivo',
  Buffer.from('abcabcabcabcabcabcabcabcabcabcabcabcabcabc'.repeat(10)),
);

runCase(
  'frase comum',
  Buffer.from('confirma party confirma party confirma party confirma party'),
);

runCase(
  'bytes aleatorios 200B',
  (() => {
    const b = Buffer.alloc(200);
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  })(),
);

runCase(
  'bytes aleatorios 2KB',
  (() => {
    const b = Buffer.alloc(2048);
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  })(),
);

runCase('todos zeros', Buffer.alloc(500, 0));

runCase('padrao de bits 10101010', Buffer.alloc(300, 0xaa));

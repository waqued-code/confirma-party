'use strict';

const { compact, expand, MIN_REF_LENGTH } = require('./compactor');

function runCase(name, input) {
  const { compacted, stats } = compact(input);
  const restored = expand(compacted);
  const ok = Buffer.compare(input, restored) === 0;
  const ratio = ((compacted.length / input.length) * 100).toFixed(2);
  console.log(`\n[${name}]`);
  console.log(`  entrada:    ${input.length} bytes (${stats.originalBits} bits)`);
  console.log(`  compactado: ${compacted.length} bytes (${ratio}%)`);
  console.log(`  tokens:     ${stats.literals} literais, ${stats.refs} refs`);
  console.log(`  bits economizados pelas refs: ${stats.savedBitsByRefs}`);
  console.log(`  round-trip:  ${ok ? 'OK' : 'FALHOU'}`);
  if (!ok) process.exitCode = 1;
}

console.log(`Limite de back-reference: length > ${MIN_REF_LENGTH - 1} bits`);

runCase('texto muito repetitivo', Buffer.from('abcabcabcabcabcabcabcabcabcabcabcabcabcabc'.repeat(10)));

runCase('frase comum', Buffer.from('confirma party confirma party confirma party confirma party'));

runCase('bytes aleatórios (deve EXPANDIR)', (() => {
  const b = Buffer.alloc(200);
  for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
})());

runCase('todos zeros', Buffer.alloc(500, 0));

runCase('padrão de bits 10101010', Buffer.alloc(300, 0xaa));

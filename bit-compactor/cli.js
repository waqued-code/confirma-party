#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { compact, expand } = require('./compactor');

function usage() {
  console.error('Uso:');
  console.error('  node cli.js compact <input> <output>');
  console.error('  node cli.js expand  <input> <output>');
  process.exit(1);
}

const [, , cmd, inPath, outPath] = process.argv;
if (!cmd || !inPath || !outPath) usage();

const input = fs.readFileSync(path.resolve(inPath));

if (cmd === 'compact') {
  const { compacted, stats } = compact(input);
  fs.writeFileSync(path.resolve(outPath), compacted);
  const ratio = (compacted.length / input.length) * 100;
  console.log(`Original:    ${input.length} bytes (${stats.originalBits} bits)`);
  console.log(`Compactado:  ${compacted.length} bytes`);
  console.log(`Razão:       ${ratio.toFixed(2)}%`);
  console.log(`Tokens:      ${stats.literals} literais, ${stats.refs} referências`);
  console.log(`Economia:    ${stats.savedBitsByRefs} bits salvos pelas referências`);
} else if (cmd === 'expand') {
  const restored = expand(input);
  fs.writeFileSync(path.resolve(outPath), restored);
  console.log(`Restaurado:  ${restored.length} bytes`);
} else {
  usage();
}

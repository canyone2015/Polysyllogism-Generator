'use strict';

const {
    generatePolysyllogism,
    formatPolysyllogism,
    TERM_POOL,
    KINDS
} = require('../src');

function randInt(a, b)    { return Math.floor(Math.random() * (b - a + 1)) + a; }

const examples = [
    { nPremises: 1,  chainDepth: 1, trueConclusion: true },
    { nPremises: 2,  chainDepth: 2, trueConclusion: true },
    { nPremises: 2,  chainDepth: 2, trueConclusion: false  },
    { nPremises: 3,  chainDepth: 3, trueConclusion: false  },
    { nPremises: 5,  chainDepth: 5, trueConclusion: true },
    { nPremises: 10, chainDepth: 2, trueConclusion: false  },
    { nPremises: 10, chainDepth: 3, trueConclusion: true },
    { nPremises: 10, chainDepth: 10, trueConclusion: true },
];

for (const opt of examples) {
    const res = generatePolysyllogism({ ...opt, termPool: TERM_POOL });
    console.log(`\n--- nPremises=${opt.nPremises}, chainDepth=${opt.chainDepth}, trueConclusion=${opt.trueConclusion}`);
    console.log(formatPolysyllogism(res));
}

console.log('\n\n=== Distribution test (100000 runs, nPremises=2-21, chainDepth=1-21) ===');
const total = { all: 0, no: 0, some: 0, some_not: 0 };
for (let i = 0; i < 100000; i++) {
    const nPremises = randInt(2, 21);
    const chainDepth = randInt(1, nPremises);
    const r = generatePolysyllogism({
        nPremises, chainDepth, termPool: TERM_POOL,
    });
    for (const k of KINDS) total[k] += r.kindCounter[k];
}
console.log(total);
const arr = Object.values(total);
console.log('skew max/min =', (Math.max(...arr) / Math.min(...arr)).toFixed(3));

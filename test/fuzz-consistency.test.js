'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { isConsistent, KINDS } = require('../src');
const { setupZ3, isConsistentZ3 } = require('../src/z3-verifier.js');

function randInt(n) { return Math.floor(Math.random() * n); }
function randPremise(terms) {
    const i = randInt(terms.length);
    let j = randInt(terms.length - 1);
    if (j >= i) j++;
    return [terms[i], KINDS[randInt(KINDS.length)], terms[j]];
}

test('fuzz isConsistent vs Z3', { timeout: 120_000 }, async () => {
    await setupZ3();

    const NUM_TESTS = parseInt(process.env.FUZZ_CC || '300', 10);
    const mismatches = [];

    for (let t = 0; t < NUM_TESTS; t++) {
        const nT = 2 + randInt(4);
        const terms = Array.from({ length: nT }, (_, i) => `T${i}`);
        const nP = 1 + randInt(6);
        const premises = Array.from({ length: nP }, () => randPremise(terms));

        const a = isConsistent(premises);
        const b = await isConsistentZ3(premises);
        if (a !== b) mismatches.push({ premises, custom: a, z3: b });
    }

    if (mismatches.length) {
        console.log('First mismatches:', JSON.stringify(mismatches.slice(0, 3), null, 2));
    }
    assert.strictEqual(mismatches.length, 0, `${mismatches.length}/${NUM_TESTS} mismatches`);
});

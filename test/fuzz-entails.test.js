'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { entails, KINDS } = require('../src');
const { setupZ3, isConsistentZ3, entailsZ3 } = require('../src/z3-verifier.js');

function randInt(n) { return Math.floor(Math.random() * n); }
function randPremise(terms) {
    const i = randInt(terms.length);
    let j = randInt(terms.length - 1);
    if (j >= i) j++;
    return [terms[i], KINDS[randInt(KINDS.length)], terms[j]];
}

test('fuzz entails vs Z3', { timeout: 180_000 }, async () => {
    await setupZ3();

    const NUM_TESTS = parseInt(process.env.FUZZ_E || '300', 10);
    const mismatches = [];

    let i = 0;
    while (i < NUM_TESTS) {
        const nT = 2 + randInt(4);
        const terms = Array.from({ length: nT }, (_, x) => `T${x}`);
        const nP = 1 + randInt(5);
        const premises = Array.from({ length: nP }, () => randPremise(terms));
        const conclusion = randPremise(terms);

        if (!(await isConsistentZ3(premises))) continue;

        const a = entails(premises, conclusion);
        const b = await entailsZ3(premises, conclusion);
        if (a !== b) mismatches.push({ premises, conclusion, custom: a, z3: b });
        i++;
    }

    if (mismatches.length) {
        console.log('First mismatches:', JSON.stringify(mismatches.slice(0, 3), null, 2));
    }
    assert.strictEqual(mismatches.length, 0, `${mismatches.length}/${NUM_TESTS} mismatches`);
});

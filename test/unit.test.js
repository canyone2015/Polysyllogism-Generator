'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
    isConsistent, entails, negate,
    generatePolysyllogism, TERM_POOL, KINDS, CHAIN_CATALOG,
} = require('../src');

test('negate is involutive', () => {
    for (const k of KINDS) {
        const p = ['A', k, 'B'];
        assert.deepStrictEqual(negate(negate(p)), p);
    }
});

test('isConsistent: trivial cases', () => {
    assert.strictEqual(isConsistent([]), true);
    assert.strictEqual(isConsistent([['A','all','B']]), true);
    assert.strictEqual(isConsistent([
        ['A','all','B'], ['A','no','B'], ['A','some','B'],
    ]), false);
});

test('isConsistent: classic Barbara is sat, its negation is unsat', () => {
    const p = [['A','all','B'], ['B','all','C']];
    assert.strictEqual(isConsistent(p), true);
    assert.strictEqual(entails(p, ['A','all','C']), true);
});

test('isConsistent: No A are B + All C are A + Some C are B is unsat', () => {
    assert.strictEqual(isConsistent([
        ['A','no','B'], ['C','all','A'], ['C','some','B'],
    ]), false);
});

test('generator runs for all small configs', () => {
    for (const nPremises of [2, 3, 4, 5, 6, 7, 8]) {
        for (let chainDepth = 1; chainDepth <= nPremises; chainDepth++) {
            for (const trueConclusion of [false, true]) {
                const res = generatePolysyllogism({
                    nPremises, chainDepth, trueConclusion, termPool: TERM_POOL,
                });
                assert.strictEqual(res.premises.length, nPremises);
                assert.ok(res.conclusion);
            }
        }
    }
});

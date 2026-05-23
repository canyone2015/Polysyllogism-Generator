'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
    generatePolysyllogism, TERM_POOL, KINDS, combinations,
} = require('../src');
const {
    setupZ3, isConsistentZ3, entailsZ3,
} = require('../src/z3-verifier.js');

async function verifyOne(result, chainDepth) {
    const { premises, conclusion, conclusionIsTrue } = result;
    const issues = [];

    if (!(await isConsistentZ3(premises)))
        issues.push('premises inconsistent (Z3)');

    const z3Entails = await entailsZ3(premises, conclusion);
    if (conclusionIsTrue && !z3Entails)
        issues.push('claimed TRUE but Z3 says not entailed');
    if (!conclusionIsTrue && z3Entails)
        issues.push('claimed FALSE but Z3 says entailed');

    if (conclusionIsTrue && chainDepth >= 2) {
        outer: for (let k = 1; k < chainDepth; k++) {
            for (const subset of combinations(premises, k)) {
                if (await entailsZ3(subset, conclusion)) {
                    issues.push(`subset of size ${k} already entails: ${JSON.stringify(subset)}`);
                    break outer;
                }
            }
        }
    }
    return issues;
}

test('generator output verified by Z3 + uniform distribution', { timeout: 600_000 }, async () => {
    await setupZ3();

    const RUNS = parseInt(process.env.GEN_RUNS || '200', 10);
    const configs = [
        { nPremises: 2,  chainDepth: 2 },
        { nPremises: 3,  chainDepth: 3 },
        { nPremises: 5,  chainDepth: 3 },
        { nPremises: 5,  chainDepth: 5 },
        { nPremises: 8,  chainDepth: 4 },
        { nPremises: 2,  chainDepth: 2, trueConclusion: false  },
        { nPremises: 5,  chainDepth: 3, trueConclusion: false  },
        { nPremises: 8,  chainDepth: 4, trueConclusion: false  },
    ];

    const failures = [];
    const kindCounts = { all: 0, no: 0, some: 0, some_not: 0 };

    for (let i = 0; i < RUNS; i++) {
        const cfg = configs[i % configs.length];
        const result = generatePolysyllogism({ ...cfg, termPool: TERM_POOL });
        for (const k of KINDS) kindCounts[k] += result.kindCounter[k];

        const issues = await verifyOne(result, cfg.chainDepth);
        if (issues.length) failures.push({ cfg, issues, result });
    }

    console.log('kindCounts:', kindCounts);
    const arr = Object.values(kindCounts);
    const skew = Math.max(...arr) / Math.max(1, Math.min(...arr));
    console.log('skew (max/min):', skew.toFixed(3));

    if (failures.length) console.log('First failure:', JSON.stringify(failures[0], null, 2));
    assert.strictEqual(failures.length, 0, `${failures.length} generator outputs failed Z3 verification`);

    // Acceptable distribution skewness is a soft test.
    assert.ok(skew < 7.0, `kind distribution skew is too large: ${skew}`);
});

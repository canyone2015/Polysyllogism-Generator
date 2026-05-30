'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { generatePolysyllogism, TERM_POOL, KINDS } = require('../src');
const { setupZ3, isConsistentZ3, entailsZ3 } = require('../src/z3-verifier.js');

const FIGURES = {
    1: [['M','P'], ['S','M']],
    2: [['P','M'], ['S','M']],
    3: [['M','P'], ['M','S']],
    4: [['P','M'], ['M','S']],
};

async function enumerateValid2Syllogisms() {
    const valid = new Set();
    for (const fig of [1, 2, 3, 4])
    for (const k1 of KINDS) for (const k2 of KINDS) {
        const [t1, t2] = FIGURES[fig];
        const p1 = [t1[0], k1, t1[1]];
        const p2 = [t2[0], k2, t2[1]];

        if (!(await isConsistentZ3([p1, p2]))) continue;

        for (const ck of KINDS) {
            if (await entailsZ3([p1, p2], ['S', ck, 'P'])) {
                valid.add(`fig${fig}|${k1}|${k2}|${ck}|SP`);
            }
        }
    }
    return valid;
}

function classifyGenerated2(result) {
    const [p1, p2] = result.premises;
    const [cl, ck, cr] = result.conclusion;

    const S = cl, P = cr;
    const allTerms = new Set([p1[0], p1[2], p2[0], p2[2]]);
    allTerms.delete(S); allTerms.delete(P);
    if (allTerms.size !== 1) return null;
    const M = [...allTerms][0];

    const rename = (t) => t === S ? 'S' : t === P ? 'P' : t === M ? 'M' : null;
    const r1 = [rename(p1[0]), p1[1], rename(p1[2])];
    const r2 = [rename(p2[0]), p2[1], rename(p2[2])];
    if (r1.some(x => x === null) || r2.some(x => x === null)) return null;

    for (const fig of [1,2,3,4]) {
        const [t1, t2] = FIGURES[fig];
        for (const [a, b] of [[r1, r2], [r2, r1]]) {
            if (a[0] === t1[0] && a[2] === t1[1] && b[0] === t2[0] && b[2] === t2[1]) {
                return `fig${fig}|${a[1]}|${b[1]}|${ck}|SP`;
            }
        }
    }
    return null;
}

test('completeness for n=2: generator covers all valid 2-syllogism forms', { timeout: 600_000 }, async () => {
    await setupZ3();

    const validForms = await enumerateValid2Syllogisms();
    console.log('Total valid 2-syllogism forms (per Z3):', validForms.size);

    const RUNS = parseInt(process.env.COMPL_RUNS || '200', 10);
    const seen = new Set();

    for (let i = 0; i < RUNS; i++) {
        const r = generatePolysyllogism({
            nPremises: 2, chainDepth: 2, termPool: TERM_POOL,
        });
        const key = classifyGenerated2(r);
        if (key && validForms.has(key)) seen.add(key);
    }

    const missing = [...validForms].filter(k => !seen.has(k));
    console.log(`Covered ${seen.size}/${validForms.size}`);
    if (missing.length) console.log('Missing forms:', missing);

    assert.strictEqual(missing.length, 0, `Generator missed ${missing.length} valid forms`);
});

test('PS conclusions are mirror-duplicates of SP under S↔P swap', { timeout: 600_000 }, async () => {
    await setupZ3();
    const swap = (t) => (t === 'S' ? 'P' : t === 'P' ? 'S' : t);

    for (const fig of [1, 2, 3, 4])
    for (const k1 of KINDS) for (const k2 of KINDS) {
        const [t1, t2] = FIGURES[fig];
        const p1 = [t1[0], k1, t1[1]];
        const p2 = [t2[0], k2, t2[1]];
        if (!(await isConsistentZ3([p1, p2]))) continue;

        for (const ck of KINDS) {
            if (!(await entailsZ3([p1, p2], ['P', ck, 'S']))) continue;

            const sp1 = [swap(p1[0]), p1[1], swap(p1[2])];
            const sp2 = [swap(p2[0]), p2[1], swap(p2[2])];
            const mirrored = await entailsZ3([sp1, sp2], ['S', ck, 'P']);

            assert.ok(
                mirrored,
                `PS fig${fig}|${k1}|${k2}|${ck} has no SP mirror after S↔P swap. ` +
                `Original premises: ${JSON.stringify([p1, p2])}; ` +
                `swapped premises:  ${JSON.stringify([sp1, sp2])}`,
            );
        }
    }
});

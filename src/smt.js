'use strict';

// Quantifier-free propositional encoding of monadic syllogistic
// logic via Venn-diagram regions.
//
// For N predicates, the universe is partitioned into 2^N atomic
// "types" (one per subset of predicates). For each type t we
// introduce a Bool  t_<bits>  meaning "this region is inhabited".
//
//   All A is B           : every region with A=1, B=0 is empty
//   No A is B            : every region with A=1, B=1 is empty
//   Some A is B          : OR of "region inhabited" over A=1, B=1
//   Some A is not B      : OR of "region inhabited" over A=1, B=0
//
// This is purely propositional (no quantifiers, no uninterpreted
// sort), so Z3 always returns sat/unsat and never unknown.

function premisesToSmtLib(premises) {
    const index = new Map();
    const order = [];
    for (const [a,, b] of premises) {
        for (const p of [a, b]) {
            if (!index.has(p)) { index.set(p, order.length); order.push(p); }
        }
    }
    const N = order.length;
    if (N === 0) return '';
    if (N > 20) {
        // 2^N regions; 20 already gives ~1M Bools. Refuse to explode.
        throw new Error(`Too many predicates for Venn encoding: ${N}`);
    }

    const numTypes = 1 << N;
    const lines = ['(set-logic QF_UF)'];

    for (let t = 0; t < numTypes; t++) {
        lines.push(`(declare-const r${t} Bool)`);
    }

    // = Existential import =
    for (let i = 0; i < N; i++) {
        const maskI = 1 << i;
        const ors = [];
        for (let t = 0; t < numTypes; t++) {
            if (t & maskI) ors.push(`r${t}`);
        }
        lines.push(`(assert (or ${ors.join(' ')}))`);
    }
    // ======================

    for (const [a, k, b] of premises) {
        const ai = index.get(a);
        const bi = index.get(b);
        const maskA = 1 << ai;
        const maskB = 1 << bi;

        if (k === 'all') {
            for (let t = 0; t < numTypes; t++) {
                if ((t & maskA) && !(t & maskB)) lines.push(`(assert (not r${t}))`);
            }
        } else if (k === 'no') {
            for (let t = 0; t < numTypes; t++) {
                if ((t & maskA) && (t & maskB)) lines.push(`(assert (not r${t}))`);
            }
        } else if (k === 'some') {
            const ors = [];
            for (let t = 0; t < numTypes; t++) {
                if ((t & maskA) && (t & maskB)) ors.push(`r${t}`);
            }
            lines.push(ors.length
                ? `(assert (or ${ors.join(' ')}))`
                : `(assert false)`);
        } else if (k === 'some_not') {
            const ors = [];
            for (let t = 0; t < numTypes; t++) {
                if ((t & maskA) && !(t & maskB)) ors.push(`r${t}`);
            }
            lines.push(ors.length
                ? `(assert (or ${ors.join(' ')}))`
                : `(assert false)`);
        } else {
            throw new Error(`Unknown kind: ${k}`);
        }
    }

    return lines.join('\n');
}

module.exports = { premisesToSmtLib };

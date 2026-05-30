'use strict';

// 1. Basics

const KINDS = ['all', 'no', 'some', 'some_not'];

function negate(premise) {
    const [a, k, b] = premise;
    return {
        'all'     : [a, 'some_not', b],
        'no'      : [a, 'some',     b],
        'some'    : [a, 'no',       b],
        'some_not': [a, 'all',      b],
    }[k];
}

function setUnion(a, b)     { const r = new Set(a); for (const x of b) r.add(x); return r; }
function setIntersect(a, b) { const r = new Set();  for (const x of a) if (b.has(x)) r.add(x); return r; }

// 2. isConsistent / entails

function isConsistent(premises) {
    const terms = new Set();
    for (const [a,, b] of premises) { terms.add(a); terms.add(b); }
    if (!terms.size) return true;

    const subset   = new Map();
    const disjoint = new Map();
    for (const t of terms) {
        subset.set(t, new Set([t]));
        disjoint.set(t, new Set());
    }
    for (const [a, k, b] of premises) {
        if      (k === 'all') subset.get(a).add(b);
        else if (k === 'no')  { disjoint.get(a).add(b); disjoint.get(b).add(a); }
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const x of terms) {
            const sx = subset.get(x), initial = sx.size, extra = new Set();
            for (const y of sx) for (const z of subset.get(y)) extra.add(z);
            for (const z of extra) sx.add(z);
            if (sx.size > initial) changed = true;
        }
    }

    changed = true;
    while (changed) {
        changed = false;
        for (const x of terms) {
            const dx = disjoint.get(x), initial = dx.size, extra = new Set();
            for (const y of subset.get(x)) for (const z of disjoint.get(y)) extra.add(z);
            for (const z of extra) dx.add(z);
            if (dx.size > initial) changed = true;
        }
        for (const x of terms) for (const y of disjoint.get(x)) {
            const dy = disjoint.get(y);
            if (!dy.has(x)) { dy.add(x); changed = true; }
        }
    }

    // = Existential import =
    for (const t of terms) {
        if (setIntersect(subset.get(t), disjoint.get(t)).size) return false;
    }
    // ======================

    for (const [a, k, b] of premises) {
        if (k === 'some') {
            const mustIn  = setUnion(subset.get(a),   subset.get(b));
            const mustOut = setUnion(disjoint.get(a), disjoint.get(b));
            if (setIntersect(mustIn, mustOut).size) return false;
        } else if (k === 'some_not') {
            const mustIn  = subset.get(a);
            const mustOut = setUnion(disjoint.get(a), new Set([b]));
            if (setIntersect(mustIn, mustOut).size) return false;
        }
    }
    return true;
}

function entails(premises, conclusion) {
    return !isConsistent([...premises, negate(conclusion)]);
}

// 3. Inference tables

// Immediate inferences (1 premise): A-B premise -> [conclusion kind, swap?]
// Only conversions valid without existential import.
const IMMEDIATE_INFERENCES = [
    { kind: 'no',   conclKind: 'no',   swap: true },   // No A is B    -> No B is A
    { kind: 'some', conclKind: 'some', swap: true },   // Some A is B  -> Some B is A
];

// Syllogistic table: 'kind1,kind2,figure' -> [valid kind3, ...]
const TRUE_CONCLUSIONS = {
    // Figure 1: M-P, S-M => S-P
    'all,all,1'      : ['all', 'some'],         // Barbara,  Barbari*
    'no,all,1'       : ['no', 'some_not'],      // Celarent, Celaront*
    'all,some,1'     : ['some'],                // Darii
    'no,some,1'      : ['some_not'],            // Ferio

    // Figure 2: P-M, S-M => S-P
    'all,no,2'       : ['no', 'some_not'],      // Camestres, Camestrop*
    'no,all,2'       : ['no', 'some_not'],      // Cesare,    Cesaro*
    'all,some_not,2' : ['some_not'],            // Baroco
    'no,some,2'      : ['some_not'],            // Festino

    // Figure 3: M-P, M-S => S-P
    'all,all,3'      : ['some'],                // Darapti*
    'some,all,3'     : ['some'],                // Disamis
    'all,some,3'     : ['some'],                // Datisi
    'no,all,3'       : ['some_not'],            // Felapton*
    'some_not,all,3' : ['some_not'],            // Bocardo
    'no,some,3'      : ['some_not'],            // Ferison

    // Figure 4: P-M, M-S => S-P
    'all,no,4'       : ['no', 'some_not'],      // Camenes, Camenop*
    'all,all,4'      : ['some'],                // Bramantip*
    'some,all,4'     : ['some'],                // Dimaris
    'no,all,4'       : ['some_not'],            // Fesapo*
    'no,some,4'      : ['some_not'],            // Fresison
};
const TRUE_CONCLUSIONS_KEYS = Object.keys(TRUE_CONCLUSIONS);

// 4. Applying one syllogism step to the propositions grid

function applySyllogism(premisesDict, figure, word1, word2, word3,
                        kind1, kind2, kind3, addKind1) {
    const setPair = (a, b, k) => {
        if (!premisesDict[a]) premisesDict[a] = {};
        premisesDict[a][b] = k;
    };
    switch (figure) {
        case '1':   // M-P, S-M => S-P
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word3, word1, kind2);
            return [word3, word2, kind3];
        case '2':   // P-M, S-M => S-P
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word3, word2, kind2);
            return [word3, word1, kind3];
        case '3':   // M-P, M-S => S-P
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word1, word3, kind2);
            return [word3, word2, kind3];
        case '4':   // P-M, M-S => S-P
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word2, word3, kind2);
            return [word3, word1, kind3];
        default:
            throw new Error('Invalid figure: ' + figure);
    }
}

function premisesDictToList(premisesDict) {
    const out = [];
    for (const a of Object.keys(premisesDict)) {
        for (const b of Object.keys(premisesDict[a])) {
            out.push([a, premisesDict[a][b], b]);
        }
    }
    return out;
}

// 5. Utils

function shuffle(arr, rand = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function* combinations(arr, k) {
    if (k === 0) { yield []; return; }
    if (k > arr.length) return;
    for (let i = 0; i <= arr.length - k; i++) {
        for (const rest of combinations(arr.slice(i + 1), k - 1)) {
            yield [arr[i], ...rest];
        }
    }
}

function randPick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

function pairKey([a, , b]) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function* shortPremisePaths(premises, w1, w2, maxLen) {
    const adj = new Map(); // term -> [{premise, other, idx}]
    premises.forEach((p, idx) => {
        const [a, , b] = p;
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a).push({ idx, other: b });
        adj.get(b).push({ idx, other: a });
    });

    const usedEdge = new Set();
    const usedNode = new Set([w1]);
    const stack = [];

    function* dfs(node) {
        if (node === w2 && stack.length > 0) { yield stack.slice(); return; }
        if (stack.length >= maxLen) return;
        for (const { idx, other } of (adj.get(node) || [])) {
            if (usedEdge.has(idx)) continue;
            if (usedNode.has(other) && other !== w2) continue;
            usedEdge.add(idx); usedNode.add(other); stack.push(idx);
            yield* dfs(other);
            stack.pop(); usedNode.delete(other); usedEdge.delete(idx);
        }
    }
    yield* dfs(w1);
}

function hasShorterProof(premises, conclusion, chainDepth) {
    const [w1, , w2] = conclusion;
    for (const idxs of shortPremisePaths(premises, w1, w2, chainDepth - 1)) {
        const subset = idxs.map(i => premises[i]);
        if (entails(subset, conclusion)) return true;
    }
    return false;
}

function relationDeterminableShort(premises, w1, w2, chainDepth) {
    for (const idxs of shortPremisePaths(premises, w1, w2, chainDepth - 1)) {
        const subset = idxs.map(i => premises[i]);
        for (const [a, b] of [[w1, w2], [w2, w1]]) {
            for (const k of KINDS) {
                if (entails(subset, [a, k, b])) return true;
            }
        }
    }
    return false;
}

// 6. Main generator

function generatePolysyllogism({
    nPremises,
    chainDepth,
    termPool,
    trueConclusion   = true,
    rand             = Math.random,
    maxChainAttempts = 50,
}) {
    if (chainDepth < 1)         throw new Error('chainDepth must be >= 1');
    if (chainDepth > nPremises) throw new Error('chainDepth must be <= nPremises');

    // chainDepth = number of premises feeding the conclusion.
    // Terms used by the chain: chainDepth + 1.
    const chainTermsNeeded = chainDepth + 1;
    const numDistractors   = nPremises - chainDepth;
    if (termPool.length < chainTermsNeeded) {
        throw new Error('not enough terms in termPool');
    }

    for (let attempt = 0; attempt < maxChainAttempts; attempt++) {
        const pool            = shuffle([...termPool], rand);
        const chainTerms      = pool.slice(0, chainTermsNeeded);
        const distractorTerms = pool;

        // Step 1. Build chain via the propositions grid
        const premisesDict = {};
        let w1, w2, conclusion;
        let failed = false;

        if (chainDepth === 1) {
            // Immediate inference: a single premise yields the conclusion.
            const [wA, wB] = chainTerms;
            const inf = randPick(IMMEDIATE_INFERENCES, rand);
            premisesDict[wA] = { [wB]: inf.kind };
            w1 = inf.swap ? wB : wA;
            w2 = inf.swap ? wA : wB;
            conclusion = inf.conclKind;
        } else {
            // chainDepth >= 2: initial syllogism (adds 2 premises) + extensions.
            const [word1, word2, word3, ...otherWords] = chainTerms;

            const initKey = randPick(TRUE_CONCLUSIONS_KEYS, rand);
            const [k1, k2, fig] = initKey.split(',');
            const k3 = randPick(TRUE_CONCLUSIONS[initKey], rand);

            [w1, w2, conclusion] = applySyllogism(
                premisesDict, fig, word1, word2, word3,
                k1, k2, k3, /*addKind1=*/true
            );

            // Each extension adds exactly one new premise
            for (let i = 0; i < chainDepth - 2; i++) {
                const newWord = otherWords[i];
                const kind1   = conclusion;

                const variants = [];
                for (const key of TRUE_CONCLUSIONS_KEYS) {
                    const [pK1, pK2, pFig] = key.split(',');
                    if (pK1 !== kind1) continue;
                    for (const k3 of TRUE_CONCLUSIONS[key]) {
                        variants.push([pK2, pFig, k3]);
                    }
                }
                if (variants.length === 0) { failed = true; break; }

                const [kind2, figure_i, kind3] = randPick(variants, rand);
                [w1, w2, conclusion] = applySyllogism(
                    premisesDict, figure_i, w1, w2, newWord,
                    kind1, kind2, kind3, /*addKind1=*/false
                );
            }
        }
        if (failed) continue;
        let finalConclusion = [w1, conclusion, w2];

        // Step 2. Distractors
        const distractorPremises = [];
        const chainPremises = premisesDictToList(premisesDict);
        const seenKeys = new Set(chainPremises.map(pairKey));
        let dFailed = false;
        for (let i = 0; i < numDistractors; i++) {
            let placed = false;
            for (let tries = 0; tries < 200; tries++) {
                let i1, i2;
                do {
                    i1 = randPick(distractorTerms, rand);
                    i2 = randPick(distractorTerms, rand);
                } while (i1 === i2 || (!chainTerms.includes(i1) && !chainTerms.includes(i2)));
                const trial = [i1, randPick(KINDS, rand), i2];

                const key = pairKey(trial);
                if (seenKeys.has(key)) continue;

                const current = [...chainPremises, ...distractorPremises];
                if (entails(current, trial)) continue;
                if (!isConsistent([...current, trial])) continue;
                if (hasShorterProof([...current, trial], finalConclusion, chainDepth)) continue; // strict chainDepth

                distractorPremises.push(trial);
                seenKeys.add(key);
                placed = true;
                break;
            }
            if (!placed) { dFailed = true; break; }
        }
        if (dFailed) continue;

        // Step 3. Assemble + validate
        const premises = [
            ...premisesDictToList(premisesDict),
            ...distractorPremises,
        ];
        let conclusionIsTrue = true;

        if (premises.length !== nPremises) continue; // sanity
        if (!isConsistent(premises)) continue;
        // Conclusion must be entailed under the Aristotelian
        // assumption (existential import is enforced by isConsistent)
        if (!entails(premises, finalConclusion)) continue;

        if (!trueConclusion) {
            const [cl, ck, cr] = finalConclusion;
            const alternatives = [];
            for (const k of KINDS) {
                for (const [a, b] of [[cl, cr], [cr, cl]]) {
                    if (a === cl && b === cr && k === ck) continue;
                    const alt = [a, k, b];
                    if (entails(premises, alt)) continue;
                    if (relationDeterminableShort(premises, a, b, chainDepth)) continue;
                    alternatives.push(alt);
                }
            }
            finalConclusion = alternatives.length
                ? randPick(alternatives, rand)
                : negate(finalConclusion);
            conclusionIsTrue = false;
        }

        shuffle(premises, rand);

        if (!isConsistent(premises))
            continue;
        if (conclusionIsTrue) {
            if (!entails(premises, finalConclusion))
                continue;
        } else {
            if (entails(premises, finalConclusion))
                continue;
            if (relationDeterminableShort(premises, w1, w2, chainDepth))
                continue;
        }

        const kindCounter = { all: 0, no: 0, some: 0, some_not: 0 };
        for (const [, k] of premises) kindCounter[k]++;

        return { premises, conclusion: finalConclusion, conclusionIsTrue, kindCounter };
    }

    throw new Error('failed to generate polysyllogism after '
                    + maxChainAttempts + ' attempts');
}

// 7. Pretty-printer

function formatPremise([a, k, b]) {
    switch (k) {
        case 'all':      return `All ${a} is ${b}.`;
        case 'no':       return `No ${a} is ${b}.`;
        case 'some':     return `Some ${a} is ${b}.`;
        case 'some_not': return `Some ${a} is not ${b}.`;
    }
}

function formatPolysyllogism({ premises, conclusion, conclusionIsTrue }) {
    const lines = premises.map((p, i) => `Premise ${i + 1}. ${formatPremise(p)}`);
    lines.push(
        `Conclusion "${formatPremise(conclusion).replace(/\.$/, '')}" is ${conclusionIsTrue ? 'TRUE' : 'FALSE'}.`
    );
    return lines.join('\n');
}

const TERM_POOL = [
    'Anchor', 'Bottle', 'Bridge', 'Castle', 'Choker', 'Comet', 'Compass', 'Country',
    'Desk', 'Diamond', 'Forest', 'Garden', 'Helmet', 'Knight', 'Lamp', 'Mountain',
    'Ocean', 'Painter', 'Pyramid', 'River', 'Robot', 'Tiger', 'Violin', 'Window', 'Wizard',
];

const TERM_POOL2 = [
    'Anchor', 'Apple', 'Arrow', 'Balloon', 'Basket', 'Beacon', 'Bicycle', 'Boat',
    'Book', 'Bottle', 'Bridge', 'Bucket', 'Cabin', 'Camera', 'Candle', 'Canyon',
    'Castle', 'Cave', 'Chair', 'Cloud', 'Clover', 'Coin', 'Comet', 'Compass',
    'Cottage', 'Country', 'Crown', 'Cup', 'Curtain', 'Desk', 'Diamond', 'Dolphin',
    'Door', 'Dragon', 'Drum', 'Eagle', 'Engine', 'Feather', 'Fence', 'Field',
    'Flag', 'Flute', 'Forest', 'Fountain', 'Garden', 'Glacier', 'Globe', 'Guitar',
    'Hammer', 'Harbor', 'Harp', 'Helmet', 'Island', 'Jacket', 'Key', 'Kite',
    'Knight', 'Ladder', 'Lamp', 'Lantern', 'Leaf', 'Library', 'Lighthouse', 'Map',
    'Meadow', 'Mirror', 'Mountain', 'Museum', 'Notebook', 'Ocean', 'Painter', 'Palace',
    'Pebble', 'Piano', 'Pillow', 'Planet', 'Pocket', 'Pond', 'Pyramid', 'Quilt',
    'Rainbow', 'Ribbon', 'River', 'Road', 'Robot', 'Rocket', 'Sailor', 'Shell',
    'Shield', 'Ship', 'Statue', 'Stone', 'Sword', 'Telescope', 'Temple', 'Tiger',
    'Tower', 'Train', 'Tree', 'Violin', 'Window', 'Wizard', 'Yacht'
];

module.exports = {
    IMMEDIATE_INFERENCES,
    TRUE_CONCLUSIONS,
    KINDS,
    TERM_POOL,
    TERM_POOL2,
    negate,
    isConsistent,
    entails,
    combinations,
    shuffle,
    generatePolysyllogism,
    formatPremise,
    formatPolysyllogism,
};

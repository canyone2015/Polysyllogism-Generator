const {
    IMMEDIATE_INFERENCES, TRUE_CONCLUSIONS,
    entails, negate, formatPremise, shuffle,
} = require('./generator');

const MOOD_NAMES = {
    'all,all,1,all' : 'Barbara', 'all,all,1,some' : 'Barbari',
    'no,all,1,no' : 'Celarent', 'no,all,1,some_not' : 'Celaront',
    'all,some,1,some' : 'Darii', 'no,some,1,some_not' : 'Ferio',
    'all,no,2,no' : 'Camestres', 'all,no,2,some_not' : 'Camestrop',
    'no,all,2,no' : 'Cesare', 'no,all,2,some_not' : 'Cesaro',
    'all,some_not,2,some_not' : 'Baroco', 'no,some,2,some_not' : 'Festino',
    'all,all,3,some' : 'Darapti', 'some,all,3,some' : 'Disamis',
    'all,some,3,some' : 'Datisi', 'no,all,3,some_not' : 'Felapton',
    'some_not,all,3,some_not' : 'Bocardo', 'no,some,3,some_not' : 'Ferison',
    'all,no,4,no' : 'Camenes', 'all,no,4,some_not' : 'Camenop',
    'all,all,4,some' : 'Bramantip', 'some,all,4,some' : 'Dimaris',
    'no,all,4,some_not' : 'Fesapo', 'no,some,4,some_not' : 'Fresison',
};

function trySyllogism(p1, p2) {
    const [a1, k1, b1] = p1, [a2, k2, b2] = p2;
    const out = [];
    const push = (figure, M, S, P) => {
        const key = `${k1},${k2},${figure}`;
        const concls = TRUE_CONCLUSIONS[key] || [];
        for (const k3 of concls) out.push({
            figure, M, S, P, k3, conclusion: [S, k3, P],
            mood: MOOD_NAMES[`${key},${k3}`] || null,
        });
    };
    if (a1 === b2 && a1 !== a2 && b1 !== a2 && b1 !== b2) push('1', a1, a2, b1);
    if (b1 === b2 && a1 !== a2 && a1 !== b2 && a2 !== b1) push('2', b1, a2, a1);
    if (a1 === a2 && b1 !== b2 && b1 !== a2 && b2 !== a1) push('3', a1, b2, b1);
    if (b1 === a2 && a1 !== b2 && a1 !== a2 && b2 !== b1) push('4', b1, b2, a1);
    return out;
}

const keyOf = ([a, k, b]) => `${a}|${k}|${b}`;

function forwardChain(premises, { maxFacts = 5000, maxIterations = 30 } = {}) {
    const propByKey = new Map();
    const known = [];

    const add = (prop, source, depth) => {
        const k = keyOf(prop);
        if (propByKey.has(k)) return null;
        if (known.length >= maxFacts) return null;
        const entry = { prop, source, depth, id: known.length };
        propByKey.set(k, entry);
        known.push(entry);
        return entry;
    };

    premises.forEach((p, i) => add(p, { type: 'premise', index: i }, 0));

    let added = true, iter = 0;
    while (added && iter < maxIterations) {
        added = false; iter++;

        for (const item of [...known]) {
            for (const rule of IMMEDIATE_INFERENCES) {
                if (item.prop[1] !== rule.kind) continue;
                const [a,,b] = item.prop;
                const np = rule.swap ? [b, rule.conclKind, a] : [a, rule.conclKind, b];
                if (!propByKey.has(keyOf(np)) &&
                    add(np, { type:'immediate', parent: item }, item.depth + 1)) added = true;
            }
        }

        const snap = [...known];
        for (let i = 0; i < snap.length; i++) {
            for (let j = 0; j < snap.length; j++) {
                if (i === j) continue;
                for (const r of trySyllogism(snap[i].prop, snap[j].prop)) {
                    if (!propByKey.has(keyOf(r.conclusion)) &&
                        add(r.conclusion, {
                            type:'syllogism',
                            parent1: snap[i], parent2: snap[j],
                            figure: r.figure, M: r.M, mood: r.mood,
                        }, Math.max(1, Math.max(snap[i].depth, snap[j].depth)) + 1)) added = true;
                    if (known.length >= maxFacts) break;
                }
                if (known.length >= maxFacts) break;
            }
            if (known.length >= maxFacts) break;
        }
    }
    return { propByKey, known };
}

function serializeStep(entry, indexLookup, premiseCount) {
    const refOf = (e) =>
        e.source.type === 'premise'
            ? { tag: `P${e.source.index + 1}`, text: formatPremise(e.prop) }
            : { tag: `S${indexLookup.get(e.id) + 1}`, text: formatPremise(e.prop) };

    if (entry.source.type === 'immediate') {
        const par = refOf(entry.source.parent);
        return {
            n: indexLookup.get(entry.id) + 1,
            kind: 'immediate',
            from: par.tag, fromText: par.text,
            result: formatPremise(entry.prop),
        };
    }
    const p1 = refOf(entry.source.parent1);
    const p2 = refOf(entry.source.parent2);
    return {
        n: indexLookup.get(entry.id) + 1,
        kind: 'syllogism',
        from1: p1.tag, from1Text: p1.text,
        from2: p2.tag, from2Text: p2.text,
        figure: entry.source.figure,
        mood:   entry.source.mood,
        middle: entry.source.M,
        result: formatPremise(entry.prop),
    };
}

function solveOne(chain, premises, conclusion) {
    const { propByKey, known } = chain;
    const [Sg,,Pg] = conclusion;

    const candidates = known.filter(e =>
        e.source.type !== 'premise' &&
        ((e.prop[0] === Sg && e.prop[2] === Pg) ||
         (e.prop[0] === Pg && e.prop[2] === Sg))
    );

    let derived = candidates.find(c => keyOf(c.prop) === keyOf(conclusion));
    if (!derived) {
        const same = candidates.filter(c => c.prop[0] === Sg && c.prop[2] === Pg);
        const pool = same.length ? same : candidates;
        pool.sort((a,b) => a.depth - b.depth);
        derived = pool[0];
    }

    const stepsRaw = [];
    const seen = new Set();
    const collect = (entry) => {
        if (!entry || seen.has(entry.id)) return;
        seen.add(entry.id);
        if (entry.source.type === 'premise') return;
        if (entry.source.type === 'immediate') {
            collect(entry.source.parent);
        } else {
            collect(entry.source.parent1);
            collect(entry.source.parent2);
        }
        stepsRaw.push(entry);
    };
    if (derived) collect(derived);

    const indexLookup = new Map();
    stepsRaw.forEach((e, i) => indexLookup.set(e.id, i));
    const steps = stepsRaw.map(e => serializeStep(e, indexLookup, premises.length));

    const isTrue = entails(premises, conclusion);
    return {
        steps,
        isTrue,
        derivedText: derived ? formatPremise(derived.prop) : null,
    };
}

function solvePolysyllogism(premises, conclusions) {
    const chain = forwardChain(premises);
    const results = conclusions.map(c => solveOne(chain, premises, c));
    return { results };
}

function pickAdditionalConclusions(premises, mainConclusion, n) {
    if (!n) return [];
    const { known } = forwardChain(premises);
    const mainKey    = keyOf(mainConclusion);
    const negMainKey = keyOf(negate(mainConclusion));

    const derived = known.filter(e =>
        e.source.type !== 'premise' && e.depth >= 1 &&
        keyOf(e.prop) !== mainKey && keyOf(e.prop) !== negMainKey
    );

    // Deduplicate by proposition key (keep deepest)
    const byKey = new Map();
    for (const e of derived) {
        const k = keyOf(e.prop);
        if (!byKey.has(k) || byKey.get(k).depth < e.depth) byKey.set(k, e);
    }
    const list = [...byKey.values()].sort((a,b) => b.depth - a.depth);
    return list.slice(0, n).map(e => ({ conclusion: e.prop, depth: e.depth }));
}

// Parser: human-readable → [a, kind, b]

function parsePremise(line) {
    let s = String(line).trim();
    s = s.replace(/^Premise\s+\d+\s*[.:)\]-]\s*/i, '');
    s = s.replace(/^Conclusion\s*[.:)\]-]?\s*/i, '');
    s = s.replace(/^\d+\s*[.):\]-]\s*/, '');
    s = s.replace(/[.;!?]+$/, '').trim();
    if (!s) throw new Error('Empty line');

    let m;
    if ((m = s.match(/^Some\s+(.+?)\s+(?:is|are)\s+not\s+(.+)$/i))) return [m[1].trim(), 'some_not', m[2].trim()];
    if ((m = s.match(/^Some\s+(.+?)\s+(?:is|are)\s+(.+)$/i)))       return [m[1].trim(), 'some',     m[2].trim()];
    if ((m = s.match(/^All\s+(.+?)\s+(?:is|are)\s+(.+)$/i)))        return [m[1].trim(), 'all',      m[2].trim()];
    if ((m = s.match(/^No\s+(.+?)\s+(?:is|are)\s+(.+)$/i)))         return [m[1].trim(), 'no',       m[2].trim()];

    throw new Error(`Cannot parse premise: "${line}"`);
}

module.exports = {
    solvePolysyllogism,
    pickAdditionalConclusions,
    parsePremise,
    forwardChain,
};

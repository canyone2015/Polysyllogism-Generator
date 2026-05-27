const { generatePolysyllogism, formatPremise, shuffle, negate, TERM_POOL2 } = require('./generator');
const { solvePolysyllogism, pickAdditionalConclusions, parsePremise } = require('./solver');

function clamp(n, lo, hi) { n = +n; if (!Number.isFinite(n)) n = lo; return Math.max(lo, Math.min(hi, Math.round(n))); }
function randInt(a, b)    { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randList(l)      { return shuffle(Array.from(l)); }

function handleGenerate(opts) {
    let pMin = clamp(opts.pMin, 1, 100);
    let pMax = clamp(opts.pMax, 1, 100);
    if (pMin > pMax) [pMin, pMax] = [pMax, pMin];

    let dMin = clamp(opts.dMin, 1, 100);
    let dMax = clamp(opts.dMax, 1, 100);
    if (dMin > dMax) [dMin, dMax] = [dMax, dMin];

    const nAdditional   = clamp(opts.nAdditional ?? 0, 0, 10);
    const conclMode     = ['true','false','random'].includes(opts.conclusion) ? opts.conclusion : 'random';

    // Try several times to satisfy random size choice
    let lastErr;
    for (let attempt = 0; attempt < 8; attempt++) {
        const nPremises  = randInt(pMin, pMax);
        const minDepth   = dMin;
        const maxDepth   = Math.min(dMax, nPremises);
        const chainDepth = randInt(minDepth, maxDepth);
        const chainTermsNeeded = chainDepth + 1;
        const numDistractors = nPremises - chainDepth;
        const minExtra = Math.ceil(numDistractors / chainTermsNeeded);
        const maxExtra = numDistractors;
        const extra = randInt(minExtra, maxExtra);
        const poolSize = chainTermsNeeded + extra;
        const pool = randList(TERM_POOL2).slice(0, poolSize);
        const trueConclusion = conclMode === 'random' ? (Math.random() < 0.5) : (conclMode === 'true');

        try {
            const poly = generatePolysyllogism({
                nPremises, chainDepth,
                termPool: pool,
                trueConclusion,
            });

            const additional = pickAdditionalConclusions(
                poly.premises, poly.conclusion, nAdditional, conclMode
            );

            return {
                nPremises, chainDepth,
                conclusionIsTrue: poly.conclusionIsTrue,
                premises: poly.premises.map(p => ({ raw: p, text: formatPremise(p) })),
                conclusion: { raw: poly.conclusion, text: formatPremise(poly.conclusion) },
                additionalConclusions: additional.map((c) => {
                    const trueConclusion = conclMode === 'random' ? (Math.random() < 0.5) : (conclMode === 'true');
                    const conclusion = trueConclusion ? c.conclusion : negate(c.conclusion);
                    return {
                        trueConclusionObject: c.conclusion,
                        trueConclusionText: formatPremise(c.conclusion),
                        rConclusionObject: conclusion,
                        rConclusionText: formatPremise(conclusion),
                        rConclusionIsTrue: trueConclusion,
                        text: formatPremise(conclusion),
                        depth: c.depth,
                    };
                })
            };
        } catch (e) { lastErr = e; }
    }
    return { error: 'Failed to generate: ' + (lastErr ? lastErr.message : 'unknown') };
}

function handleSolve({ premisesText = '', conclusionsText = '' }) {
    // Parse premises
    const premiseLines = premisesText.split('\n').map(s => s.trim()).filter(Boolean);
    const premises = [];
    for (const line of premiseLines) {
        try { premises.push(parsePremise(line)); }
        catch (e) { return { error: e.message }; }
    }
    if (!premises.length) return { error: 'No premises provided.' };

    // Parse conclusions
    const conclusionLines = conclusionsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!conclusionLines.length) return { error: 'No conclusions provided to test.' };

    const parsedConcls = [];
    for (const line of conclusionLines) {
        try { parsedConcls.push({ text: line, prop: parsePremise(line) }); }
        catch (e) { parsedConcls.push({ text: line, error: e.message }); }
    }

    const goodConcls = parsedConcls.filter(c => !c.error).map(c => c.prop);

    let solveOut;
    try {
        solveOut = solvePolysyllogism(premises, goodConcls);
    } catch (e) {
        return { error: 'Solver failed: ' + e.message };
    }

    let gi = 0;
    const results = parsedConcls.map((c) => {
        if (c.error) return { conclusionText: c.text, error: c.error };
        const r = solveOut.results[gi++];
        return {
            conclusionText: formatPremise(c.prop),
            isTrue: r.isTrue,
            steps: r.steps,
            derivedText: r.derivedText,
        };
    });

    return {
        premises: premises.map(formatPremise),
        results,
    };
}

module.exports = { handleGenerate, handleSolve };

'use strict';

const { init } = require('z3-solver');
const { negate } = require('./generator.js');
const { premisesToSmtLib } = require('./smt.js');

let Z3CTX = null;

async function setupZ3() {
    if (Z3CTX) return Z3CTX;
    const { Context } = await init();
    Z3CTX = Context('main');
    return Z3CTX;
}

// SMT query cache: key is program text.
const _cache = new Map();

async function _checkSmt(smt, timeoutMs) {
    // if (_cache.has(smt)) return _cache.get(smt);
    const solver = new Z3CTX.Solver();
    solver.set('timeout', timeoutMs);
    solver.fromString(smt);
    const r = await solver.check();
    if (r === 'unknown') throw new Error('Z3 returned unknown for:\n' + smt);
    const sat = r === 'sat';
    // _cache.set(smt, sat);
    return sat;
}

async function isConsistentZ3(premises, timeoutMs = 5000) {
    if (premises.length === 0) return true;
    const smt = premisesToSmtLib(premises) + '\n(check-sat)\n';
    return _checkSmt(smt, timeoutMs);
}

async function entailsZ3(premises, conclusion, timeoutMs = 5000) {
    return !(await isConsistentZ3([...premises, negate(conclusion)], timeoutMs));
}

module.exports = { setupZ3, isConsistentZ3, entailsZ3 };

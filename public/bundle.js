var PolyAPI = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/generator.js
  var require_generator = __commonJS({
    "src/generator.js"(exports, module) {
      "use strict";
      var KINDS = ["all", "no", "some", "some_not"];
      function negate(premise) {
        const [a, k, b] = premise;
        return {
          "all": [a, "some_not", b],
          "no": [a, "some", b],
          "some": [a, "no", b],
          "some_not": [a, "all", b]
        }[k];
      }
      function setUnion(a, b) {
        const r = new Set(a);
        for (const x of b) r.add(x);
        return r;
      }
      function setIntersect(a, b) {
        const r = /* @__PURE__ */ new Set();
        for (const x of a) if (b.has(x)) r.add(x);
        return r;
      }
      function isConsistent(premises) {
        const terms = /* @__PURE__ */ new Set();
        for (const [a, , b] of premises) {
          terms.add(a);
          terms.add(b);
        }
        if (!terms.size) return true;
        const subset = /* @__PURE__ */ new Map();
        const disjoint = /* @__PURE__ */ new Map();
        for (const t of terms) {
          subset.set(t, /* @__PURE__ */ new Set([t]));
          disjoint.set(t, /* @__PURE__ */ new Set());
        }
        for (const [a, k, b] of premises) {
          if (k === "all") subset.get(a).add(b);
          else if (k === "no") {
            disjoint.get(a).add(b);
            disjoint.get(b).add(a);
          }
        }
        let changed = true;
        while (changed) {
          changed = false;
          for (const x of terms) {
            const sx = subset.get(x), initial = sx.size, extra = /* @__PURE__ */ new Set();
            for (const y of sx) for (const z of subset.get(y)) extra.add(z);
            for (const z of extra) sx.add(z);
            if (sx.size > initial) changed = true;
          }
        }
        changed = true;
        while (changed) {
          changed = false;
          for (const x of terms) {
            const dx = disjoint.get(x), initial = dx.size, extra = /* @__PURE__ */ new Set();
            for (const y of subset.get(x)) for (const z of disjoint.get(y)) extra.add(z);
            for (const z of extra) dx.add(z);
            if (dx.size > initial) changed = true;
          }
          for (const x of terms) for (const y of disjoint.get(x)) {
            const dy = disjoint.get(y);
            if (!dy.has(x)) {
              dy.add(x);
              changed = true;
            }
          }
        }
        for (const t of terms) {
          if (setIntersect(subset.get(t), disjoint.get(t)).size) return false;
        }
        for (const [a, k, b] of premises) {
          if (k === "some") {
            const mustIn = setUnion(subset.get(a), subset.get(b));
            const mustOut = setUnion(disjoint.get(a), disjoint.get(b));
            if (setIntersect(mustIn, mustOut).size) return false;
          } else if (k === "some_not") {
            const mustIn = subset.get(a);
            const mustOut = setUnion(disjoint.get(a), /* @__PURE__ */ new Set([b]));
            if (setIntersect(mustIn, mustOut).size) return false;
          }
        }
        return true;
      }
      function entails(premises, conclusion) {
        return !isConsistent([...premises, negate(conclusion)]);
      }
      var IMMEDIATE_INFERENCES = [
        { kind: "no", conclKind: "no", swap: true },
        // No A is B    -> No B is A
        { kind: "some", conclKind: "some", swap: true }
        // Some A is B  -> Some B is A
      ];
      var TRUE_CONCLUSIONS = {
        // Figure 1: M-P, S-M => S-P
        "all,all,1": ["all", "some"],
        // Barbara,  Barbari*
        "no,all,1": ["no", "some_not"],
        // Celarent, Celaront*
        "all,some,1": ["some"],
        // Darii
        "no,some,1": ["some_not"],
        // Ferio
        // Figure 2: P-M, S-M => S-P
        "all,no,2": ["no", "some_not"],
        // Camestres, Camestrop*
        "no,all,2": ["no", "some_not"],
        // Cesare,    Cesaro*
        "all,some_not,2": ["some_not"],
        // Baroco
        "no,some,2": ["some_not"],
        // Festino
        // Figure 3: M-P, M-S => S-P
        "all,all,3": ["some"],
        // Darapti*
        "some,all,3": ["some"],
        // Disamis
        "all,some,3": ["some"],
        // Datisi
        "no,all,3": ["some_not"],
        // Felapton*
        "some_not,all,3": ["some_not"],
        // Bocardo
        "no,some,3": ["some_not"],
        // Ferison
        // Figure 4: P-M, M-S => S-P
        "all,no,4": ["no", "some_not"],
        // Camenes, Camenop*
        "all,all,4": ["some"],
        // Bramantip*
        "some,all,4": ["some"],
        // Dimaris
        "no,all,4": ["some_not"],
        // Fesapo*
        "no,some,4": ["some_not"]
        // Fresison
      };
      var TRUE_CONCLUSIONS_KEYS = Object.keys(TRUE_CONCLUSIONS);
      function applySyllogism(premisesDict, figure, word1, word2, word3, kind1, kind2, kind3, addKind1) {
        const setPair = (a, b, k) => {
          if (!premisesDict[a]) premisesDict[a] = {};
          premisesDict[a][b] = k;
        };
        switch (figure) {
          case "1":
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word3, word1, kind2);
            return [word3, word2, kind3];
          case "2":
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word3, word2, kind2);
            return [word3, word1, kind3];
          case "3":
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word1, word3, kind2);
            return [word3, word2, kind3];
          case "4":
            if (addKind1) setPair(word1, word2, kind1);
            setPair(word2, word3, kind2);
            return [word3, word1, kind3];
          default:
            throw new Error("Invalid figure: " + figure);
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
      function shuffle(arr, rand = Math.random) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }
      function* combinations(arr, k) {
        if (k === 0) {
          yield [];
          return;
        }
        if (k > arr.length) return;
        for (let i = 0; i <= arr.length - k; i++) {
          for (const rest of combinations(arr.slice(i + 1), k - 1)) {
            yield [arr[i], ...rest];
          }
        }
      }
      function randPick(arr, rand) {
        return arr[Math.floor(rand() * arr.length)];
      }
      function pairKey([a, , b]) {
        return a < b ? `${a}|${b}` : `${b}|${a}`;
      }
      function* shortPremisePaths(premises, w1, w2, maxLen) {
        const adj = /* @__PURE__ */ new Map();
        premises.forEach((p, idx) => {
          const [a, , b] = p;
          if (!adj.has(a)) adj.set(a, []);
          if (!adj.has(b)) adj.set(b, []);
          adj.get(a).push({ idx, other: b });
          adj.get(b).push({ idx, other: a });
        });
        const usedEdge = /* @__PURE__ */ new Set();
        const usedNode = /* @__PURE__ */ new Set([w1]);
        const stack = [];
        function* dfs(node) {
          if (node === w2 && stack.length > 0) {
            yield stack.slice();
            return;
          }
          if (stack.length >= maxLen) return;
          for (const { idx, other } of adj.get(node) || []) {
            if (usedEdge.has(idx)) continue;
            if (usedNode.has(other) && other !== w2) continue;
            usedEdge.add(idx);
            usedNode.add(other);
            stack.push(idx);
            yield* dfs(other);
            stack.pop();
            usedNode.delete(other);
            usedEdge.delete(idx);
          }
        }
        yield* dfs(w1);
      }
      function hasShorterProof(premises, conclusion, chainDepth) {
        const [w1, , w2] = conclusion;
        for (const idxs of shortPremisePaths(premises, w1, w2, chainDepth - 1)) {
          const subset = idxs.map((i) => premises[i]);
          if (entails(subset, conclusion)) return true;
        }
        return false;
      }
      function relationDeterminableShort(premises, w1, w2, chainDepth) {
        for (const idxs of shortPremisePaths(premises, w1, w2, chainDepth - 1)) {
          const subset = idxs.map((i) => premises[i]);
          for (const [a, b] of [[w1, w2], [w2, w1]]) {
            for (const k of KINDS) {
              if (entails(subset, [a, k, b])) return true;
            }
          }
        }
        return false;
      }
      function generatePolysyllogism({
        nPremises,
        chainDepth,
        termPool,
        trueConclusion = true,
        rand = Math.random,
        maxChainAttempts = 50
      }) {
        if (chainDepth < 1) throw new Error("chainDepth must be >= 1");
        if (chainDepth > nPremises) throw new Error("chainDepth must be <= nPremises");
        const chainTermsNeeded = chainDepth + 1;
        const numDistractors = nPremises - chainDepth;
        if (termPool.length < chainTermsNeeded) {
          throw new Error("not enough terms in termPool");
        }
        for (let attempt = 0; attempt < maxChainAttempts; attempt++) {
          const pool = shuffle([...termPool], rand);
          const chainTerms = pool.slice(0, chainTermsNeeded);
          const distractorTerms = pool;
          const premisesDict = {};
          let w1, w2, conclusion;
          let failed = false;
          if (chainDepth === 1) {
            const [wA, wB] = chainTerms;
            const inf = randPick(IMMEDIATE_INFERENCES, rand);
            premisesDict[wA] = { [wB]: inf.kind };
            w1 = inf.swap ? wB : wA;
            w2 = inf.swap ? wA : wB;
            conclusion = inf.conclKind;
          } else {
            const [word1, word2, word3, ...otherWords] = chainTerms;
            const initKey = randPick(TRUE_CONCLUSIONS_KEYS, rand);
            const [k1, k2, fig] = initKey.split(",");
            const k3 = randPick(TRUE_CONCLUSIONS[initKey], rand);
            [w1, w2, conclusion] = applySyllogism(
              premisesDict,
              fig,
              word1,
              word2,
              word3,
              k1,
              k2,
              k3,
              /*addKind1=*/
              true
            );
            for (let i = 0; i < chainDepth - 2; i++) {
              const newWord = otherWords[i];
              const kind1 = conclusion;
              const variants = [];
              for (const key of TRUE_CONCLUSIONS_KEYS) {
                const [pK1, pK2, pFig] = key.split(",");
                if (pK1 !== kind1) continue;
                for (const k32 of TRUE_CONCLUSIONS[key]) {
                  variants.push([pK2, pFig, k32]);
                }
              }
              if (variants.length === 0) {
                failed = true;
                break;
              }
              const [kind2, figure_i, kind3] = randPick(variants, rand);
              [w1, w2, conclusion] = applySyllogism(
                premisesDict,
                figure_i,
                w1,
                w2,
                newWord,
                kind1,
                kind2,
                kind3,
                /*addKind1=*/
                false
              );
            }
          }
          if (failed) continue;
          let finalConclusion = [w1, conclusion, w2];
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
              } while (i1 === i2 || !chainTerms.includes(i1) && !chainTerms.includes(i2));
              const trial = [i1, randPick(KINDS, rand), i2];
              const key = pairKey(trial);
              if (seenKeys.has(key)) continue;
              const current = [...chainPremises, ...distractorPremises];
              if (entails(current, trial)) continue;
              if (!isConsistent([...current, trial])) continue;
              if (hasShorterProof([...current, trial], finalConclusion, chainDepth)) continue;
              distractorPremises.push(trial);
              seenKeys.add(key);
              placed = true;
              break;
            }
            if (!placed) {
              dFailed = true;
              break;
            }
          }
          if (dFailed) continue;
          const premises = [
            ...premisesDictToList(premisesDict),
            ...distractorPremises
          ];
          let conclusionIsTrue = true;
          if (premises.length !== nPremises) continue;
          if (!isConsistent(premises)) continue;
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
            finalConclusion = alternatives.length ? randPick(alternatives, rand) : negate(finalConclusion);
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
        throw new Error("failed to generate polysyllogism after " + maxChainAttempts + " attempts");
      }
      function formatPremise([a, k, b]) {
        switch (k) {
          case "all":
            return `All ${a} is ${b}.`;
          case "no":
            return `No ${a} is ${b}.`;
          case "some":
            return `Some ${a} is ${b}.`;
          case "some_not":
            return `Some ${a} is not ${b}.`;
        }
      }
      function formatPolysyllogism({ premises, conclusion, conclusionIsTrue }) {
        const lines = premises.map((p, i) => `Premise ${i + 1}. ${formatPremise(p)}`);
        lines.push(
          `Conclusion "${formatPremise(conclusion).replace(/\.$/, "")}" is ${conclusionIsTrue ? "TRUE" : "FALSE"}.`
        );
        return lines.join("\n");
      }
      var TERM_POOL = [
        "Anchor",
        "Bottle",
        "Bridge",
        "Castle",
        "Choker",
        "Comet",
        "Compass",
        "Country",
        "Desk",
        "Diamond",
        "Forest",
        "Garden",
        "Helmet",
        "Knight",
        "Lamp",
        "Mountain",
        "Ocean",
        "Painter",
        "Pyramid",
        "River",
        "Robot",
        "Tiger",
        "Violin",
        "Window",
        "Wizard"
      ];
      var TERM_POOL2 = [
        "Anchor",
        "Apple",
        "Arrow",
        "Balloon",
        "Basket",
        "Beacon",
        "Bicycle",
        "Boat",
        "Book",
        "Bottle",
        "Bridge",
        "Bucket",
        "Cabin",
        "Camera",
        "Candle",
        "Canyon",
        "Castle",
        "Cave",
        "Chair",
        "Cloud",
        "Clover",
        "Coin",
        "Comet",
        "Compass",
        "Cottage",
        "Country",
        "Crown",
        "Cup",
        "Curtain",
        "Desk",
        "Diamond",
        "Dolphin",
        "Door",
        "Dragon",
        "Drum",
        "Eagle",
        "Engine",
        "Feather",
        "Fence",
        "Field",
        "Flag",
        "Flute",
        "Forest",
        "Fountain",
        "Garden",
        "Glacier",
        "Globe",
        "Guitar",
        "Hammer",
        "Harbor",
        "Harp",
        "Helmet",
        "Island",
        "Jacket",
        "Key",
        "Kite",
        "Knight",
        "Ladder",
        "Lamp",
        "Lantern",
        "Leaf",
        "Library",
        "Lighthouse",
        "Map",
        "Meadow",
        "Mirror",
        "Mountain",
        "Museum",
        "Notebook",
        "Ocean",
        "Painter",
        "Palace",
        "Pebble",
        "Piano",
        "Pillow",
        "Planet",
        "Pocket",
        "Pond",
        "Pyramid",
        "Quilt",
        "Rainbow",
        "Ribbon",
        "River",
        "Road",
        "Robot",
        "Rocket",
        "Sailor",
        "Shell",
        "Shield",
        "Ship",
        "Statue",
        "Stone",
        "Sword",
        "Telescope",
        "Temple",
        "Tiger",
        "Tower",
        "Train",
        "Tree",
        "Violin",
        "Window",
        "Wizard",
        "Yacht"
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
        formatPolysyllogism
      };
    }
  });

  // src/solver.js
  var require_solver = __commonJS({
    "src/solver.js"(exports, module) {
      var {
        IMMEDIATE_INFERENCES,
        TRUE_CONCLUSIONS,
        entails,
        negate,
        formatPremise,
        shuffle
      } = require_generator();
      var MOOD_NAMES = {
        "all,all,1,all": "Barbara",
        "all,all,1,some": "Barbari",
        "no,all,1,no": "Celarent",
        "no,all,1,some_not": "Celaront",
        "all,some,1,some": "Darii",
        "no,some,1,some_not": "Ferio",
        "all,no,2,no": "Camestres",
        "all,no,2,some_not": "Camestrop",
        "no,all,2,no": "Cesare",
        "no,all,2,some_not": "Cesaro",
        "all,some_not,2,some_not": "Baroco",
        "no,some,2,some_not": "Festino",
        "all,all,3,some": "Darapti",
        "some,all,3,some": "Disamis",
        "all,some,3,some": "Datisi",
        "no,all,3,some_not": "Felapton",
        "some_not,all,3,some_not": "Bocardo",
        "no,some,3,some_not": "Ferison",
        "all,no,4,no": "Camenes",
        "all,no,4,some_not": "Camenop",
        "all,all,4,some": "Bramantip",
        "some,all,4,some": "Dimaris",
        "no,all,4,some_not": "Fesapo",
        "no,some,4,some_not": "Fresison"
      };
      function trySyllogism(p1, p2) {
        const [a1, k1, b1] = p1, [a2, k2, b2] = p2;
        const out = [];
        const push = (figure, M, S, P) => {
          const key = `${k1},${k2},${figure}`;
          const concls = TRUE_CONCLUSIONS[key] || [];
          for (const k3 of concls) out.push({
            figure,
            M,
            S,
            P,
            k3,
            conclusion: [S, k3, P],
            mood: MOOD_NAMES[`${key},${k3}`] || null
          });
        };
        if (a1 === b2 && a1 !== a2 && b1 !== a2 && b1 !== b2) push("1", a1, a2, b1);
        if (b1 === b2 && a1 !== a2 && a1 !== b2 && a2 !== b1) push("2", b1, a2, a1);
        if (a1 === a2 && b1 !== b2 && b1 !== a2 && b2 !== a1) push("3", a1, b2, b1);
        if (b1 === a2 && a1 !== b2 && a1 !== a2 && b2 !== b1) push("4", b1, b2, a1);
        return out;
      }
      var keyOf = ([a, k, b]) => `${a}|${k}|${b}`;
      function forwardChain(premises, { maxFacts = 5e3, maxIterations = 30 } = {}) {
        const propByKey = /* @__PURE__ */ new Map();
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
        premises.forEach((p, i) => add(p, { type: "premise", index: i }, 0));
        let added = true, iter = 0;
        while (added && iter < maxIterations) {
          added = false;
          iter++;
          for (const item of [...known]) {
            for (const rule of IMMEDIATE_INFERENCES) {
              if (item.prop[1] !== rule.kind) continue;
              const [a, , b] = item.prop;
              const np = rule.swap ? [b, rule.conclKind, a] : [a, rule.conclKind, b];
              if (!propByKey.has(keyOf(np)) && add(np, { type: "immediate", parent: item }, item.depth + 1)) added = true;
            }
          }
          const snap = [...known];
          for (let i = 0; i < snap.length; i++) {
            for (let j = 0; j < snap.length; j++) {
              if (i === j) continue;
              for (const r of trySyllogism(snap[i].prop, snap[j].prop)) {
                if (!propByKey.has(keyOf(r.conclusion)) && add(r.conclusion, {
                  type: "syllogism",
                  parent1: snap[i],
                  parent2: snap[j],
                  figure: r.figure,
                  M: r.M,
                  mood: r.mood
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
        const refOf = (e) => e.source.type === "premise" ? { tag: `P${e.source.index + 1}`, text: formatPremise(e.prop) } : { tag: `S${indexLookup.get(e.id) + 1}`, text: formatPremise(e.prop) };
        if (entry.source.type === "immediate") {
          const par = refOf(entry.source.parent);
          return {
            n: indexLookup.get(entry.id) + 1,
            kind: "immediate",
            from: par.tag,
            fromText: par.text,
            result: formatPremise(entry.prop)
          };
        }
        const p1 = refOf(entry.source.parent1);
        const p2 = refOf(entry.source.parent2);
        return {
          n: indexLookup.get(entry.id) + 1,
          kind: "syllogism",
          from1: p1.tag,
          from1Text: p1.text,
          from2: p2.tag,
          from2Text: p2.text,
          figure: entry.source.figure,
          mood: entry.source.mood,
          middle: entry.source.M,
          result: formatPremise(entry.prop)
        };
      }
      function solveOne(chain, premises, conclusion) {
        const { propByKey, known } = chain;
        const [Sg, , Pg] = conclusion;
        const candidates = known.filter(
          (e) => e.source.type !== "premise" && (e.prop[0] === Sg && e.prop[2] === Pg || e.prop[0] === Pg && e.prop[2] === Sg)
        );
        let derived = candidates.find((c) => keyOf(c.prop) === keyOf(conclusion));
        if (!derived) {
          const same = candidates.filter((c) => c.prop[0] === Sg && c.prop[2] === Pg);
          const pool = same.length ? same : candidates;
          pool.sort((a, b) => a.depth - b.depth);
          derived = pool[0];
        }
        const stepsRaw = [];
        const seen = /* @__PURE__ */ new Set();
        const collect = (entry) => {
          if (!entry || seen.has(entry.id)) return;
          seen.add(entry.id);
          if (entry.source.type === "premise") return;
          if (entry.source.type === "immediate") {
            collect(entry.source.parent);
          } else {
            collect(entry.source.parent1);
            collect(entry.source.parent2);
          }
          stepsRaw.push(entry);
        };
        if (derived) collect(derived);
        const indexLookup = /* @__PURE__ */ new Map();
        stepsRaw.forEach((e, i) => indexLookup.set(e.id, i));
        const steps = stepsRaw.map((e) => serializeStep(e, indexLookup, premises.length));
        const isTrue = entails(premises, conclusion);
        return {
          steps,
          isTrue,
          derivedText: derived ? formatPremise(derived.prop) : null
        };
      }
      function solvePolysyllogism(premises, conclusions) {
        const chain = forwardChain(premises);
        const results = conclusions.map((c) => solveOne(chain, premises, c));
        return { results };
      }
      function pickAdditionalConclusions(premises, mainConclusion, n) {
        if (!n) return [];
        const { known } = forwardChain(premises);
        const mainKey = keyOf(mainConclusion);
        const negMainKey = keyOf(negate(mainConclusion));
        const derived = known.filter(
          (e) => e.source.type !== "premise" && e.depth >= 1 && keyOf(e.prop) !== mainKey && keyOf(e.prop) !== negMainKey
        );
        const byKey = /* @__PURE__ */ new Map();
        for (const e of derived) {
          const k = keyOf(e.prop);
          if (!byKey.has(k) || byKey.get(k).depth < e.depth) byKey.set(k, e);
        }
        const list = [...byKey.values()].sort((a, b) => b.depth - a.depth);
        return list.slice(0, n).map((e) => ({ conclusion: e.prop, depth: e.depth }));
      }
      function parsePremise(line) {
        let s = String(line).trim();
        s = s.replace(/^Premise\s+\d+\s*[.:)\]-]\s*/i, "");
        s = s.replace(/^Conclusion\s*[.:)\]-]?\s*/i, "");
        s = s.replace(/^\d+\s*[.):\]-]\s*/, "");
        s = s.replace(/[.;!?]+$/, "").trim();
        if (!s) throw new Error("Empty line");
        let m;
        if (m = s.match(/^Some\s+(.+?)\s+(?:is|are)\s+not\s+(.+)$/i)) return [m[1].trim(), "some_not", m[2].trim()];
        if (m = s.match(/^Some\s+(.+?)\s+(?:is|are)\s+(.+)$/i)) return [m[1].trim(), "some", m[2].trim()];
        if (m = s.match(/^All\s+(.+?)\s+(?:is|are)\s+(.+)$/i)) return [m[1].trim(), "all", m[2].trim()];
        if (m = s.match(/^No\s+(.+?)\s+(?:is|are)\s+(.+)$/i)) return [m[1].trim(), "no", m[2].trim()];
        throw new Error(`Cannot parse premise: "${line}"`);
      }
      module.exports = {
        solvePolysyllogism,
        pickAdditionalConclusions,
        parsePremise,
        forwardChain
      };
    }
  });

  // src/api.js
  var require_api = __commonJS({
    "src/api.js"(exports, module) {
      var { generatePolysyllogism, formatPremise, shuffle, negate, TERM_POOL2 } = require_generator();
      var { solvePolysyllogism, pickAdditionalConclusions, parsePremise } = require_solver();
      function clamp(n, lo, hi) {
        n = +n;
        if (!Number.isFinite(n)) n = lo;
        return Math.max(lo, Math.min(hi, Math.round(n)));
      }
      function randInt(a, b) {
        return Math.floor(Math.random() * (b - a + 1)) + a;
      }
      function randList(l) {
        return shuffle(Array.from(l));
      }
      function handleGenerate(opts) {
        let pMin = clamp(opts.pMin, 1, 100);
        let pMax = clamp(opts.pMax, 1, 100);
        if (pMin > pMax) [pMin, pMax] = [pMax, pMin];
        let dMin = clamp(opts.dMin, 1, 100);
        let dMax = clamp(opts.dMax, 1, 100);
        if (dMin > dMax) [dMin, dMax] = [dMax, dMin];
        const nAdditional = clamp(opts.nAdditional ?? 0, 0, 10);
        const conclMode = ["true", "false", "random"].includes(opts.conclusion) ? opts.conclusion : "random";
        let lastErr;
        for (let attempt = 0; attempt < 8; attempt++) {
          const nPremises = randInt(pMin, pMax);
          const minDepth = dMin;
          const maxDepth = Math.min(dMax, nPremises);
          const chainDepth = randInt(minDepth, maxDepth);
          const chainTermsNeeded = chainDepth + 1;
          const numDistractors = nPremises - chainDepth;
          const minExtra = Math.ceil(numDistractors / chainTermsNeeded);
          const maxExtra = numDistractors;
          const extra = randInt(minExtra, maxExtra);
          const poolSize = chainTermsNeeded + extra;
          const pool = randList(TERM_POOL2).slice(0, poolSize);
          const trueConclusion = conclMode === "random" ? Math.random() < 0.5 : conclMode === "true";
          try {
            const poly = generatePolysyllogism({
              nPremises,
              chainDepth,
              termPool: pool,
              trueConclusion
            });
            const additional = pickAdditionalConclusions(
              poly.premises,
              poly.conclusion,
              nAdditional,
              conclMode
            );
            return {
              nPremises,
              chainDepth,
              conclusionIsTrue: poly.conclusionIsTrue,
              premises: poly.premises.map((p) => ({ raw: p, text: formatPremise(p) })),
              conclusion: { raw: poly.conclusion, text: formatPremise(poly.conclusion) },
              additionalConclusions: additional.map((c) => {
                const trueConclusion2 = conclMode === "random" ? Math.random() < 0.5 : conclMode === "true";
                const conclusion = trueConclusion2 ? c.conclusion : negate(c.conclusion);
                return {
                  trueConclusionObject: c.conclusion,
                  trueConclusionText: formatPremise(c.conclusion),
                  rConclusionObject: conclusion,
                  rConclusionText: formatPremise(conclusion),
                  rConclusionIsTrue: trueConclusion2,
                  text: formatPremise(conclusion),
                  depth: c.depth
                };
              })
            };
          } catch (e) {
            lastErr = e;
          }
        }
        return { error: "Failed to generate: " + (lastErr ? lastErr.message : "unknown") };
      }
      function handleSolve({ premisesText = "", conclusionsText = "" }) {
        const premiseLines = premisesText.split("\n").map((s) => s.trim()).filter(Boolean);
        const premises = [];
        for (const line of premiseLines) {
          try {
            premises.push(parsePremise(line));
          } catch (e) {
            return { error: e.message };
          }
        }
        if (!premises.length) return { error: "No premises provided." };
        const conclusionLines = conclusionsText.split("\n").map((s) => s.trim()).filter(Boolean);
        if (!conclusionLines.length) return { error: "No conclusions provided to test." };
        const parsedConcls = [];
        for (const line of conclusionLines) {
          try {
            parsedConcls.push({ text: line, prop: parsePremise(line) });
          } catch (e) {
            parsedConcls.push({ text: line, error: e.message });
          }
        }
        const goodConcls = parsedConcls.filter((c) => !c.error).map((c) => c.prop);
        let solveOut;
        try {
          solveOut = solvePolysyllogism(premises, goodConcls);
        } catch (e) {
          return { error: "Solver failed: " + e.message };
        }
        let gi = 0;
        const results = parsedConcls.map((c) => {
          if (c.error) return { conclusionText: c.text, error: c.error };
          const r = solveOut.results[gi++];
          return {
            conclusionText: formatPremise(c.prop),
            isTrue: r.isTrue,
            steps: r.steps,
            derivedText: r.derivedText
          };
        });
        return {
          premises: premises.map(formatPremise),
          results
        };
      }
      module.exports = { handleGenerate, handleSolve };
    }
  });
  return require_api();
})();

# Polysyllogism generator

A polysyllogism generator with premises of the form
`All A is B`, `No A is B`, `Some A is B`, `Some A is not B`
and correctness verification via the Z3 SMT solver.

## Features

- Constructive generation of polysyllogisms from a catalog of valid 2-syllogisms.
- Parameters: `nPremises`, `chainDepth`, `trueConclusion`.
- Support for arbitrary chain depth (sorites).
- Distractors on fresh terms — they do not affect the derivation of the conclusion.
- Reference verification of all checks via Z3 (`z3-solver`, WASM, installed from npm).

## Installation

```bash
npm install
```

## Usage

```bash
npm run demo
```

Programmatically:

```javascript
const { generatePolysyllogism, TERM_POOL, formatPolysyllogism } = require('./src');

const result = generatePolysyllogism({
    nPremises: 5,
    chainDepth: 3,
    trueConclusion: true,
    termPool: TERM_POOL,
});

console.log(formatPolysyllogism(result));
```

## Testing

```bash
npm run test:unit   # unit tests without Z3
npm run test:fuzz   # fuzzing isConsistent / entails against Z3
npm run test:gen    # verification of generator outputs via Z3
npm run test:full   # completeness for n=2
```

## Premise semantics

| Form              | Sets               | FOL                          |
|-------------------|--------------------|------------------------------|
| `All A is B`      | A ⊆ B              | ∀x (A(x) → B(x))             |
| `No A is B`       | A ∩ B = ∅          | ∀x (A(x) → ¬B(x))            |
| `Some A is B`     | A ∩ B ≠ ∅          | ∃x (A(x) ∧ B(x))             |
| `Some A is not B` | A ⊄ B              | ∃x (A(x) ∧ ¬B(x))            |

/* Theme */
const themeBtn = document.getElementById('theme-toggle');
function setTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.textContent = t === 'dark' ? 'Moon' : 'Sun';
    try { localStorage.setItem('pgs_theme', t); } catch (_) {}
}
setTheme(localStorage.getItem('pgs_theme') || 'light');
themeBtn.onclick = () =>
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

const PERSISTED_INPUTS = ['pMin', 'pMax', 'dMin', 'dMax', 'conclMode', 'nAdd',
                          'user-premises', 'user-conclusions'];

PERSISTED_INPUTS.forEach(id => {
    const elx = document.getElementById(id);
    if (!elx) return;
    const saved = localStorage.getItem('pgs_field:' + id);
    if (saved !== null) elx.value = saved;
    const evt = (elx.tagName === 'SELECT') ? 'change' : 'input';
    elx.addEventListener(evt, () => {
        try { localStorage.setItem('pgs_field:' + id, elx.value); } catch (_) {}
    });
});

/* Tabs */
function activateTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    try { localStorage.setItem('pgs_activeTab', name); } catch (_) {}
}
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => activateTab(tab.dataset.tab);
});
activateTab(localStorage.getItem('pgs_activeTab') || 'generate');

/* Tiny DOM helpers */
const $ = id => document.getElementById(id);
function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) {
        for (const [k, v] of Object.entries(props)) {
            if (k === 'class') e.className = v;
            else if (k === 'style') e.setAttribute('style', v);
            else e[k] = v;
        }
    }
    for (const k of kids.flat()) {
        if (k == null || k === false) continue;
        e.append(k.nodeType ? k : document.createTextNode(k));
    }
    return e;
}
const setBusy = (btn, busy, label) => {
    btn.disabled = busy;
    btn.textContent = busy ? '...' : label;
};

/* Generate */
$('btn-generate').onclick = async () => {
    const btn = $('btn-generate');
    setBusy(btn, true, 'Generate');
    const out = $('generate-result');
    out.innerHTML = '';
    try {
        const opts = {
            pMin: +$('pMin').value, pMax: +$('pMax').value,
            dMin: +$('dMin').value, dMax: +$('dMax').value,
            conclusion: $('conclMode').value,
            nAdditional: +$('nAdd').value,
        };
        const res = PolyAPI.handleGenerate(opts);
        const hide = $('conclMode').value === 'random';
        try {
            localStorage.setItem('pgs_generateResult', JSON.stringify({ res, hideConclusion: hide }));
        } catch (_) {}
        renderGenerate(res, hide);
    } catch (e) {
        try { localStorage.removeItem('pgs_generateResult'); } catch (_) {}
        out.appendChild(el('div', {class:'error-box'}, 'Network error: ' + e.message));
    } finally { setBusy(btn, false, 'Generate'); }
};

function renderGenerate(res, hideConclusion) {
    const out = $('generate-result');
    out.innerHTML = '';
    if (res.error) {
        out.appendChild(el('div', {class:'error-box'}, 'Error: ' + res.error));
        return;
    }
    const card = el('div', {class:'card'});

    card.append(el('h2', null,
        `Polysyllogism — ${res.nPremises} premises, chain depth ${res.chainDepth}`));

    const ul = el('ul', {class:'premise-list'});
    res.premises.forEach((p, i) => ul.append(el('li', null, `${i + 1}. ${p.text}`)));
    card.append(ul);

    const cc = el('div', {class:'result-conclusion'});
    cc.append(el('strong', null, 'Main conclusion: '));
    cc.append(res.conclusion.text);
    const answerElement = el('span', {class:'badge'}, hideConclusion ? 'ANSWER' : (res.conclusionIsTrue ? 'TRUE' : 'FALSE'));
    answerElement.addEventListener('click', () => {
        answerElement.innerHTML = res.conclusionIsTrue ? 'TRUE' : 'FALSE';
    });
    cc.append(answerElement);

    card.append(cc);

    if (res.additionalConclusions?.length) {
        card.append(el('div', {class:'section-sub'}, 'Additional conclusions'));
        res.additionalConclusions.forEach((ac, i) => {
            const answerElement = el('span', {class:'badge'}, hideConclusion ? 'ANSWER' : (ac.rConclusionIsTrue ? 'TRUE' : 'FALSE'));
            answerElement.addEventListener('click', () => {
                answerElement.innerHTML = ac.rConclusionIsTrue ? 'TRUE' : 'FALSE';
            });
            const d = el('div', {class:'conclusion-block'},
                `${i + 1}. ${ac.rConclusionText}`,
                answerElement,
                el('span', {class:'hint', style:'margin-left:8px'}, `depth ${ac.depth}`));
            card.append(d);
        });
    }

    const send = el('button', {class:'btn-secondary'}, 'Send to solver →');
    send.onclick = () => {
        $('user-premises').value = res.premises.map(p => p.text).join('\n');
        const cs = [res.conclusion.text,
            ...(res.additionalConclusions || []).map(c => c.text)];
        $('user-conclusions').value = cs.join('\n');

        try {
            localStorage.setItem('pgs_field:user-premises', $('user-premises').value);
            localStorage.setItem('pgs_field:user-conclusions', $('user-conclusions').value);
        } catch (_) {}

        document.querySelector('.tab[data-tab="solve"]').click();
        $('solve-result').innerHTML = '';
        window.scrollTo({top: 0, behavior:'smooth'});
    };
    card.append(el('div', {class:'actions'}, send));
    out.append(card);
}

/* Solve */
$('btn-solve').onclick = async () => {
    const btn = $('btn-solve');
    setBusy(btn, true, 'Solve');
    const out = $('solve-result');
    out.innerHTML = '';
    try {
        const opts = {
            premisesText: $('user-premises').value,
            conclusionsText: $('user-conclusions').value,
        };
        const res = PolyAPI.handleSolve(opts);
        try { localStorage.setItem('pgs_solveResult', JSON.stringify(res)); } catch (_) {}
        renderSolve(res);
    } catch (e) {
        try { localStorage.removeItem('pgs_solveResult'); } catch (_) {}
        out.appendChild(el('div', {class:'error-box'}, 'Network error: ' + e.message));
    } finally { setBusy(btn, false, 'Solve'); }
};

function renderSolve(res) {
    const out = $('solve-result');
    out.innerHTML = '';
    if (res.error) {
        out.appendChild(el('div', {class:'error-box'}, 'Error: ' + res.error));
        return;
    }

    // Parsed premises (shared by all conclusions)
    const head = el('div', {class:'card'});
    head.append(el('h2', null, 'Parsed premises'));
    const ul = el('ul', {class:'premise-list'});
    res.premises.forEach((t, i) => ul.append(el('li', null, `P${i+1}. ${t}`)));
    head.append(ul);
    out.append(head);

    res.results.forEach((r, i) => {
        const card = el('div', {class:'card'});

        const title = el('h2', null, `Conclusion ${i+1}: `);
        title.append(el('code', null, r.conclusionText));
        if (!r.error) title.append(el('span',
            {class:'badge ' + (r.isTrue ? 'true':'false')},
            r.isTrue ? 'TRUE' : 'FALSE'));
        card.append(title);

        if (r.error) {
            card.append(el('div', {class:'error-box'}, r.error));
            out.append(card);
            return;
        }

        if (!r.steps.length) {
            card.append(el('div', {class:'step'},
                'No syllogistic chain connects the two terms of this conclusion ',
                'via valid forward inference rules. ',
                r.isTrue
                    ? '(But it is still entailed by the premises — likely via existential import.)'
                    : '(Therefore the proposition is not entailed.)'
            ));
        } else {
            r.steps.forEach(s => {
                const d = el('div', {class:'step'});
                d.append(el('span', {class:'step-num'}, `Step ${s.n}.`));
                if (s.kind === 'immediate') {
                    d.append(' From ', s.from, ' (',
                             el('code', null, s.fromText), ') ',
                             el('span', {class:'meta'}, 'by conversion'),
                             el('span', {class:'arrow'}, '⇒'),
                             el('code', null, s.result));
                } else {
                    d.append(' From ', s.from1, ' (',
                             el('code', null, s.from1Text),
                             ') and ', s.from2, ' (',
                             el('code', null, s.from2Text), ') ',
                             el('span', {class:'meta'},
                                `— Figure ${s.figure}${s.mood ? ' (' + s.mood + ')' : ''}, middle "${s.middle}"`),
                             el('span', {class:'arrow'}, '⇒'),
                             el('code', null, s.result));
                }
                card.append(d);
            });
        }

        const verdict = el('div', {class:'result-conclusion'});
        verdict.append(el('strong', null, 'Verdict: '));
        verdict.append(
            r.isTrue
              ? 'The conclusion IS entailed by the premises.'
              : 'The conclusion is NOT entailed by the premises.'
        );
        if (r.derivedText && r.derivedText !== r.conclusionText) {
            verdict.append(el('br'));
            verdict.append('Closest derived proposition: ',
                el('code', null, r.derivedText));
        }
        card.append(verdict);
        out.append(card);
    });
}

/* Restore generate-result */
try {
    const raw = localStorage.getItem('pgs_generateResult');
    if (raw) {
        const { res, hideConclusion } = JSON.parse(raw);
        renderGenerate(res, hideConclusion);
    }
} catch (_) {}

try {
    const raw = localStorage.getItem('pgs_solveResult');
    if (raw) renderSolve(JSON.parse(raw));
} catch (_) {}

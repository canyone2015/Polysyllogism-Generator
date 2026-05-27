const http = require('http');
const fs   = require('fs');
const path = require('path');

const {
    generatePolysyllogism,
    formatPremise,
    shuffle,
    negate,
    TERM_POOL2,
} = require('./generator');

const {
    solvePolysyllogism,
    pickAdditionalConclusions,
    parsePremise,
} = require('./solver');

const { handleGenerate, handleSolve } = require('./api');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css' : 'text/css; charset=utf-8',
    '.js'  : 'application/javascript; charset=utf-8',
};

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
        req.on('end',  () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === 'POST' && req.url === '/api/generate') {
            const opts = await readBody(req);
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify(handleGenerate(opts)));
            return;
        }
        if (req.method === 'POST' && req.url === '/api/solve') {
            const opts = await readBody(req);
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify(handleSolve(opts)));
            return;
        }
        // static
        const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
        const filePath = path.join(__dirname, '..', 'public', url);
        if (!filePath.startsWith(path.join(__dirname, '..', 'public'))) {
            res.writeHead(403); res.end('Forbidden'); return;
        }
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
            res.end(data);
        });
    } catch (e) {
        res.writeHead(400, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ error: e.message }));
    }
});

const PORT = process.env.PORT || 4828;
server.listen(PORT, () => console.log(`Polysyllogism Workshop → http://localhost:${PORT}`));

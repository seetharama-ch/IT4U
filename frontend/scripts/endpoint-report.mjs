import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_ROOT = path.resolve(__dirname, '../src');
const BACKEND_ROOT = path.resolve(__dirname, '../../backend/src/main/java');
const DOCS_DIR = path.resolve(__dirname, '../../docs');

const ENDPOINTS_FRONTEND_MD = path.join(DOCS_DIR, 'ENDPOINTS-Frontend.md');
const ENDPOINTS_BACKEND_MD = path.join(DOCS_DIR, 'ENDPOINTS-Backend.md');
const ENDPOINTS_MATCH_REPORT_MD = path.join(DOCS_DIR, 'ENDPOINTS-MATCH-REPORT.md');

// --- Frontend Scanner ---
function scanFrontend() {
    console.log('Scanning Frontend...');
    const endpoints = new Set();

    function traverse(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fp = path.join(dir, file);
            if (fs.statSync(fp).isDirectory()) {
                traverse(fp);
            } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
                const content = fs.readFileSync(fp, 'utf-8');
                // Basic regex for axios/fetch calls - this is heuristic
                // capturing: method, url
                // Improved regex for axios/fetch calls
                const regexes = [
                    /(?:axios|apiClient)\.(get|post|put|delete|patch)\s*\(\s*(['"`])(.*?)\2/gi,
                    /fetch\s*\(\s*(['"`])(.*?)\1/gi,
                    /(['"`])(\/api\/.*?)\1/gi // Catch standalone api strings
                ];

                regexes.forEach(re => {
                    let match;
                    // Reset lastIndex for global regex
                    re.lastIndex = 0;
                    while ((match = re.exec(content)) !== null) {
                        let method = 'UNKNOWN';
                        let url = '';

                        if (match.length >= 4 && (match[0].startsWith('axios') || match[0].startsWith('apiClient'))) {
                            // Group 1: method, Group 3: url
                            method = match[1].toUpperCase();
                            url = match[3];
                        } else if (match.length >= 3 && match[0].startsWith('fetch')) {
                            url = match[2];
                            method = 'GET';
                        } else if (match[0].includes('/api/')) {
                            // Standalone string
                            url = match[2] || match[0].replace(/['"`]/g, '');
                            method = 'VARIOUS';
                        }

                        if (url && url.includes('/api/')) {
                            // Clean url (remove query params for matching)
                            url = url.split('?')[0];
                            // Try to generalize IDs
                            url = url.replace(/\/\${.*?}/g, '/{id}');
                            url = url.replace(/\/[\d+]/g, '/{id}');

                            endpoints.add(`${method} ${url} (found in ${file})`);
                        }
                    }
                });
            }
        }
    }
    traverse(FRONTEND_ROOT);
    return Array.from(endpoints).sort();
}

// --- Backend Scanner ---
function scanBackend() {
    console.log('Scanning Backend...');
    const endpoints = new Set();

    function traverse(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fp = path.join(dir, file);
            if (fs.statSync(fp).isDirectory()) {
                traverse(fp);
            } else if (file.endsWith('Controller.java')) {
                const content = fs.readFileSync(fp, 'utf-8');
                // Very naive parsing of RequestMapping at class level + method level
                // Real parsing needs AST, this is regex approach

                let classMapping = '';
                const classMatch = /@RequestMapping\s*\(\s*(?:value\s*=\s*)?['"](.*?)['"]/.exec(content);
                if (classMatch) {
                    classMapping = classMatch[1];
                }

                // Find methods
                const methods = [
                    { ann: 'GetMapping', verb: 'GET' },
                    { ann: 'PostMapping', verb: 'POST' },
                    { ann: 'PutMapping', verb: 'PUT' },
                    { ann: 'DeleteMapping', verb: 'DELETE' },
                    { ann: 'PatchMapping', verb: 'PATCH' },
                    { ann: 'RequestMapping', verb: 'ALL' }
                ];

                methods.forEach(m => {
                    const re = new RegExp(`@${m.ann}\\s*\\(\\s*(?:(?:value|path)\\s*=\s*)?['"](.*?)['"]`, 'g');
                    let match;
                    while ((match = re.exec(content)) !== null) {
                        let path = match[1];
                        let fullPath = (classMapping + path).replace('//', '/');
                        endpoints.add(`${m.verb} ${fullPath} (found in ${file})`);
                    }
                });
            }
        }
    }
    traverse(BACKEND_ROOT);
    return Array.from(endpoints).sort();
}

// --- Report Generation ---
const frontendEndpoints = scanFrontend();
const backendEndpoints = scanBackend();

let output = '# Frontend Endpoints\n\n';
frontendEndpoints.forEach(e => output += `- ${e}\n`);
fs.writeFileSync(ENDPOINTS_FRONTEND_MD, output);

output = '# Backend Endpoints\n\n';
backendEndpoints.forEach(e => output += `- ${e}\n`);
fs.writeFileSync(ENDPOINTS_BACKEND_MD, output);

// Comparison
const report = ['# Endpoint Match Report\n'];
report.push('| Status | Method | Path | Source |');
report.push('|---|---|---|---|');

// Normalize for comparison
const beSet = new Set(backendEndpoints.map(e => {
    const parts = e.split(' ');
    // e.g. GET /api/tickets (found in TicketController.java)
    return `${parts[0]} ${parts[1]}`;
}));

const feSet = new Set(frontendEndpoints.map(e => {
    const parts = e.split(' ');
    return `${parts[0]} ${parts[1]}`;
}));

// Check Front against Back
frontendEndpoints.forEach(fe => {
    const parts = fe.split(' ');
    const signature = `${parts[0]} ${parts[1]}`;
    let status = '❌ frontend-only';

    // Fuzzy match attempt
    let match = false;
    for (const be of beSet) {
        if (be === signature) match = true;
        // Try to match {id} vs {ticketId} etc
        const beRegex = new RegExp('^' + be.replace(/{.*?}/g, '.*') + '$');
        if (beRegex.test(signature)) match = true;
    }

    if (match) status = '✅ matched';

    report.push(`| ${status} | ${parts[0]} | ${parts[1]} | ${fe.substring(fe.indexOf('('))} |`);
});

// Check Back against Front (reverse check)
backendEndpoints.forEach(be => {
    const parts = be.split(' ');
    const signature = `${parts[0]} ${parts[1]}`;

    // Check if covered by frontend
    // Complex because frontend might use simplified paths
});

// Just write the Frontend view validated against backend for now as requested
fs.writeFileSync(ENDPOINTS_MATCH_REPORT_MD, report.join('\n'));

console.log('Reports generated in docs/');

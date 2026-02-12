const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, 'reports');
const backendPath = path.join(reportDir, 'backend-endpoints.json');
const frontendPath = path.join(reportDir, 'frontend-endpoints.json');
const routesPath = path.join(reportDir, 'frontend-routes.md');
const outReport = path.join(reportDir, 'integration-report.md');

try {
    const backend = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
    const frontend = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));

    // Normalize paths for comparison (ignore trailing slashes, potentially variables)
    // Backend paths often have {id} variabels. Frontend might have ${id} or hardcoded /1.
    // Heuristic: convert {foo} to * and match.

    function normalize(p) {
        if (!p) return '';
        // Replace {variable} with *
        let n = p.replace(/\{[^}]+\}/g, '*');
        // Replace :variable (express/frontend style) with *
        n = n.replace(/\:[a-zA-Z0-9_]+/g, '*');
        // Replace ${...} (js template) with *
        n = n.replace(/\$\{[^\}]+\}/g, '*');
        return n.toLowerCase();
    }

    const beSet = new Set(backend.map(e => `${e.method}:${normalize(e.path)}`));
    const feSet = new Set(frontend.map(e => `${e.method}:${normalize(e.path)}`));

    const matched = [];
    const missingInBackend = [];
    const unusedBackend = [];

    // Check Frontend against Backend
    frontend.forEach(fe => {
        const key = `${fe.method}:${normalize(fe.path)}`;
        if (beSet.has(key)) {
            matched.push(fe);
        } else {
            // Try to find if path exists with different method
            const pathKeyGet = `GET:${normalize(fe.path)}`;
            const pathKeyPost = `POST:${normalize(fe.path)}`;
            if (beSet.has(pathKeyGet) || beSet.has(pathKeyPost)) {
                missingInBackend.push({ ...fe, note: 'Method mismatch or partial match' });
            } else {
                missingInBackend.push(fe);
            }
        }
    });

    // Check Backend against Frontend
    backend.forEach(be => {
        const key = `${be.method}:${normalize(be.path)}`;
        // Filter out actuator stuff if unwanted? 
        if (be.path.startsWith('/actuator') || be.path.startsWith('/error')) return;

        if (!feSet.has(key)) {
            unusedBackend.push(be);
        }
    });

    let report = '# Integration Report\n\n';

    report += '## ✅ Matched endpoints\n\n';
    report += '| Method | Path | Frontend Context |\n|---|---|---|\n';
    matched.forEach(m => {
        report += `| ${m.method} | \`${m.path}\` | ${m.context || ''} |\n`;
    });

    report += '\n## ❌ Frontend calls missing in backend (Potential 404s)\n\n';
    report += '| Method | Path | Location |\n|---|---|---|\n';
    missingInBackend.forEach(m => {
        report += `| ${m.method} | \`${m.path}\` | \`${m.location}\` |\n`;
    });

    report += '\n## ❌ Backend endpoints unused by frontend\n\n';
    report += '| Method | Path | Source |\n|---|---|---|\n';
    unusedBackend.forEach(u => {
        report += `| ${u.method} | \`${u.path}\` | ${u.source} |\n`;
    });

    report += '\n## 🔐 Auth/Route Issues\n\n';
    report += '- Check these potential issues manually:\n';
    report += '  - Frontend calls to `/api/auth/me` should handle 401 gracefully.\n';
    report += '  - Routes should generally follow `/app/**` structure.\n';

    fs.writeFileSync(outReport, report);
    console.log('Generated integration report at ' + outReport);

} catch (e) {
    console.error('Error generating report:', e);
}

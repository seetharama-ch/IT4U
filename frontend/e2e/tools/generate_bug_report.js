const fs = require('fs');
const path = require('path');

const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');

function safeRead(p) {
    try { return fs.readFileSync(p, 'utf-8'); } catch { return null; }
}

function findArtifacts(dir) {
    const artifacts = [];
    if (!fs.existsSync(dir)) return artifacts;

    const walk = (d) => {
        for (const f of fs.readdirSync(d)) {
            const fp = path.join(d, f);
            const st = fs.statSync(fp);
            if (st.isDirectory()) walk(fp);
            else {
                if (f.endsWith('.png') || f.endsWith('.webm') || f === 'trace.zip')
                    artifacts.push(fp.replace(process.cwd() + path.sep, ''));
            }
        }
    };
    walk(dir);
    return artifacts;
}

function main() {
    const raw = safeRead(resultsPath);
    if (!raw) {
        console.log('No results.json found. Run tests first.');
        process.exit(1);
    }

    const json = JSON.parse(raw);
    const failures = [];

    // Playwright JSON reporter structure: tests inside suites/specs
    function collectSuites(suite) {
        if (suite.specs) {
            for (const spec of suite.specs) {
                for (const t of (spec.tests || [])) {
                    for (const r of (t.results || [])) {
                        if (r.status === 'failed') {
                            failures.push({
                                title: `${spec.title} :: ${t.title}`,
                                error: r.error?.message || 'Unknown error',
                                outputDir: r.attachments?.find(a => a.path)?.path
                                    ? path.dirname(r.attachments.find(a => a.path).path)
                                    : null
                            });
                        }
                    }
                }
            }
        }
        for (const s of (suite.suites || [])) collectSuites(s);
    }

    collectSuites(json.suites[0] || json);

    const lines = [];
    lines.push(`# IT4U E2E Bug Report (Auto-Generated)`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push(`- Total Failures: ${failures.length}`);
    lines.push(`- Evidence: screenshots/videos/traces in test-results + playwright-report`);
    lines.push('');

    if (failures.length === 0) {
        lines.push(`✅ No failures detected.`);
    } else {
        lines.push(`## Failures`);
        failures.forEach((f, i) => {
            lines.push(`### ${i + 1}) ${f.title}`);
            lines.push(`**Error:**`);
            lines.push('```');
            lines.push(f.error);
            lines.push('```');

            // gather artifacts from likely output dir root
            const out = f.outputDir ? path.resolve(process.cwd(), f.outputDir) : path.join(process.cwd(), 'test-results');
            const artifacts = findArtifacts(out);

            if (artifacts.length) {
                lines.push(`**Artifacts:**`);
                artifacts.forEach(a => lines.push(`- ${a}`));
            } else {
                lines.push(`**Artifacts:** Not auto-detected (check test-results folder).`);
            }

            lines.push('');
            lines.push(`**Re-verify steps:**`);
            lines.push(`1) Open playwright-report (HTML)`);
            lines.push(`2) Open trace.zip for this failure`);
            lines.push(`3) Re-run the single test with --headed --workers=1`);
            lines.push('');
        });

        lines.push(`## Re-Run Commands`);
        lines.push('```powershell');
        lines.push('cd frontend');
        lines.push('npx playwright test --headed --workers=1');
        lines.push('# single spec');
        lines.push('npx playwright test e2e/it4u_e2e_ticket_lifecycle.spec.ts --headed --workers=1');
        lines.push('```');
    }

    const outFile = path.join(process.cwd(), 'test-results', 'BUG_REPORT.md');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, lines.join('\n'), 'utf-8');
    console.log(`Bug report written: ${outFile}`);
}

main();

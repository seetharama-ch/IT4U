const fs = require('fs');
const path = require('path');

const mappingsPath = path.join(__dirname, 'reports', 'actuator-mappings.json');
const outJsonPath = path.join(__dirname, 'reports', 'backend-endpoints.json');
const outMdPath = path.join(__dirname, 'reports', 'backend-endpoints.md');

try {
    const rawData = fs.readFileSync(mappingsPath, 'utf8');
    const data = JSON.parse(rawData);

    // Navigate to dispatcherServlet mappings
    // Structure: contexts -> application -> mappings -> dispatcherServlets -> dispatcherServlet
    const context = data.contexts['application'] || data.contexts['it4u']; // Fallback if name changes
    const dispatcher = context?.mappings?.dispatcherServlets?.dispatcherServlet;

    if (!dispatcher) {
        console.error('Could not find dispatcherServlet mappings in JSON');
        process.exit(1);
    }

    const endpoints = [];

    dispatcher.forEach(mapping => {
        const details = mapping.details;
        if (!details || !details.requestMappingConditions) return;

        const methods = details.requestMappingConditions.methods || ['ALL'];
        const patterns = details.requestMappingConditions.patterns || [];
        const handler = mapping.handler;

        // Skip internal error handlers if desired, keeping for now

        methods.forEach(method => {
            patterns.forEach(pattern => {
                endpoints.push({
                    method: method,
                    path: pattern,
                    handler: handler,
                    // Security is not directly in mappings, will interpret based on path later or manual review
                    security: 'Unknown'
                });
            });
        });
    });

    // Sort by path
    endpoints.sort((a, b) => a.path.localeCompare(b.path));

    // Write JSON
    fs.writeFileSync(outJsonPath, JSON.stringify(endpoints, null, 2));

    // Write MD
    let mdContent = '# Backend Endpoints Inventory\n\n';
    mdContent += '| Method | Path | Handler |\n';
    mdContent += '|---|---|---|\n';

    endpoints.forEach(ep => {
        mdContent += `| ${ep.method} | \`${ep.path}\` | \`${ep.handler}\` |\n`;
    });

    fs.writeFileSync(outMdPath, mdContent);
    console.log(`Generated ${outJsonPath} and ${outMdPath} with ${endpoints.length} endpoints.`);

} catch (err) {
    console.error('Error processing mappings:', err);
    process.exit(1);
}

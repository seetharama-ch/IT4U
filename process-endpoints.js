const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, 'reports');
const apiHitsPath = path.join(reportDir, 'frontend-api-hits.txt');
const routeHitsPath = path.join(reportDir, 'frontend-route-hits.txt');
const backendStaticPath = path.join(reportDir, 'backend-mapping-hits.txt');
const actuatorPath = path.join(reportDir, 'actuator-mappings.json');

const outFrontendJson = path.join(reportDir, 'frontend-endpoints.json');
const outFrontendMd = path.join(reportDir, 'frontend-endpoints.md');
const outRoutesMd = path.join(reportDir, 'frontend-routes.md');
const outBackendJson = path.join(reportDir, 'backend-endpoints.json');
const outBackendMd = path.join(reportDir, 'backend-endpoints.md');

// Helper to sanitize path
function cleanPath(p) {
    return p.replace(/["']/g, '').trim();
}

function processFrontend() {
    // Process API calls
    const apiEndpoints = [];
    if (fs.existsSync(apiHitsPath)) {
        const lines = fs.readFileSync(apiHitsPath, 'utf8').split('\n');
        lines.forEach(line => {
            // Line format: Path:Line => Content
            // Example: .../src/api/client.js:10 => axios.get('/api/users')
            const parts = line.split(' => ');
            if (parts.length < 2) return;

            const loc = parts[0].trim();
            const content = parts[1].trim();

            let method = 'GET'; // Default
            if (content.match(/\.post\(/i)) method = 'POST';
            if (content.match(/\.put\(/i)) method = 'PUT';
            if (content.match(/\.delete\(/i)) method = 'DELETE';

            // Extract URL/Path
            const urlMatch = content.match(/['"`]([^'"`]+)['"`]/);
            if (urlMatch) {
                apiEndpoints.push({
                    method: method,
                    path: cleanPath(urlMatch[1]),
                    location: loc,
                    context: loc.includes('Admin') ? 'Admin' : 'User' // Naive inference
                });
            }
        });
    }

    fs.writeFileSync(outFrontendJson, JSON.stringify(apiEndpoints, null, 2));

    let md = '# Frontend API Calls\n\n| Method | Path | Location | Context |\n|---|---|---|---|\n';
    apiEndpoints.forEach(ep => {
        md += `| ${ep.method} | \`${ep.path}\` | \`${ep.location}\` | ${ep.context} |\n`;
    });
    fs.writeFileSync(outFrontendMd, md);

    // Process Routes
    let routes = [];
    if (fs.existsSync(routeHitsPath)) {
        const lines = fs.readFileSync(routeHitsPath, 'utf8').split('\n');
        lines.forEach(line => {
            const parts = line.split(' => ');
            if (parts.length < 2) return;
            const content = parts[1].trim();

            // Extract path prop
            const pathMatch = content.match(/path\s*=\s*["']([^"']+)["']/);
            if (pathMatch) {
                routes.push(pathMatch[1]);
            }
        });
    }

    // De-duplicate
    routes = [...new Set(routes)].sort();

    let routeMd = '# Frontend Routes\n\n';
    routes.forEach(r => routeMd += `- \`${r}\`\n`);
    fs.writeFileSync(outRoutesMd, routeMd);
}

function processBackend() {
    // If actuator json exists, use it (retry logic from process-mappings.js, but simpler)
    // If not, parse static hits

    let endpoints = [];

    if (fs.existsSync(actuatorPath)) {
        try {
            console.log('Using Actuator mappings...');
            const data = JSON.parse(fs.readFileSync(actuatorPath, 'utf8'));
            const context = data.contexts['application'] || data.contexts['it4u'];
            const dispatcher = context?.mappings?.dispatcherServlets?.dispatcherServlet;
            if (dispatcher) {
                dispatcher.forEach(m => {
                    const d = m.details?.requestMappingConditions;
                    if (d) {
                        const methods = d.methods || ['ALL'];
                        const patterns = d.patterns || [];
                        methods.forEach(met => {
                            patterns.forEach(pat => {
                                endpoints.push({ method: met, path: pat, source: 'Actuator' });
                            });
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Actuator parse error', e);
        }
    }

    if (endpoints.length === 0 && fs.existsSync(backendStaticPath)) {
        console.log('Using Static Backend Scan...');
        const lines = fs.readFileSync(backendStaticPath, 'utf8').split('\n');
        // Group by Controller? Simpler: Just extract mapping info.
        // Static scan is hard to produce full paths without class context.
        // Format: Path:Line => @GetMapping("/api/...")

        // We need a smart parser to accumulate class-level mappings vs method-level.
        // Since the static scan is just a grep, the context is lost (lines are isolated).
        // However, the report format in "backend-mapping-hits.txt" includes file path.
        // We can group by file path!

        const fileMappings = {};

        lines.forEach(line => {
            const parts = line.split(' => ');
            if (parts.length < 2) return;

            const loc = parts[0]; // .../Controller.java:20
            const lastColon = loc.lastIndexOf(':');
            const filePath = lastColon > 1 ? loc.substring(0, lastColon) : loc;
            const content = parts[1].trim();

            if (!fileMappings[filePath]) fileMappings[filePath] = { classLevel: [], methods: [] };

            const match = content.match(/@(Request|Get|Post|Put|Delete)Mapping\s*(\(["']?([^"'\)]*)["']?\)?)/);
            if (match) {
                const type = match[1]; // Get, Post, etc. or Request
                let pathVal = match[3] || ''; // /api/...

                // Normalize method
                let method = 'GET';
                if (type === 'Post') method = 'POST';
                if (type === 'Put') method = 'PUT';
                if (type === 'Delete') method = 'DELETE';
                if (type === 'Request') method = 'ALL'; // or unknown

                // If line contains class definition or is at top, maybe class level? 
                // The grep doesn't say. But usually class level is first.
                // Heuristic: If path starts with /api and looks like a base, treat as possible class.
                // Actually, the user requirement B "Infer full path using class-level + method-level mappings"
                // This is hard with just grep output.
                // But let's look at the mapping-hits.txt content from previous step.
                // formatting:
                // .../AdminEmailAuditController.java:20 => @RequestMapping("/api/admin/email-audit")
                // .../AdminEmailAuditController.java:26 => @GetMapping

                // Strategy: For each file, find the @RequestMapping with a path (likely class level if early).
                // Then prepend it to others.

                fileMappings[filePath].methods.push({ method, pathVal });
            }
        });

        // Resolve paths
        for (const f in fileMappings) {
            const m = fileMappings[f];
            // Find class level prefix
            // Heuristic: The one with @RequestMapping and a path, usually comes first or has /api prefix
            // But @RequestMapping can be on method too.
            // Assume first @RequestMapping is class level if multiple exist?
            // Or assume specific pattern.

            let prefix = '';
            // Check for items with method 'ALL' (from @RequestMapping)
            const classCandidates = m.methods.filter(x => x.method === 'ALL' && x.pathVal.length > 0);
            if (classCandidates.length > 0) {
                prefix = classCandidates[0].pathVal;
                // Remove it from methods list to avoid duplication if it's class level only
                // But it might be an endpoint too. 
                // If it is class level, there is usually no method body directly handling request without method annotation?
                // Let's assume it IS class level.
            }

            m.methods.forEach(item => {
                if (item.method === 'ALL' && item.pathVal === prefix) return; // Skip the class def itself

                let full = prefix;
                if (item.pathVal) {
                    if (full.endsWith('/') && item.pathVal.startsWith('/')) full += item.pathVal.substring(1);
                    else if (!full.endsWith('/') && !item.pathVal.startsWith('/')) full += '/' + item.pathVal;
                    else full += item.pathVal;
                }

                // clean double slashes
                full = full.replace(/\/\//g, '/');
                endpoints.push({ method: item.method, path: full, source: 'Static' });
            });
        }
    }

    // Sort
    endpoints.sort((a, b) => a.path.localeCompare(b.path));

    fs.writeFileSync(outBackendJson, JSON.stringify(endpoints, null, 2));

    let md = '# Backend Endpoints (Inventory)\n\n| Method | Path | Source |\n|---|---|---|\n';
    endpoints.forEach(ep => {
        md += `| ${ep.method} | \`${ep.path}\` | ${ep.source} |\n`;
    });
    fs.writeFileSync(outBackendMd, md);
}

processFrontend();
processBackend();

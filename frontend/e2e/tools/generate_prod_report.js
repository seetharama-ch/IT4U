/**
 * Production Test Report Generator
 * Generates comprehensive test reports from Playwright results
 */

const fs = require('fs');
const path = require('path');

// Read test results
const resultsPath = path.join(__dirname, '..', '..', 'test-results', 'results.json');

if (!fs.existsSync(resultsPath)) {
    console.error('❌ No test results found. Run tests first: npm run test:prod');
    process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// Process results
const totalTests = results.suites.reduce((sum, suite) => sum + suite.specs.length, 0);
const passedTests = results.suites.reduce((sum, suite) =>
    sum + suite.specs.filter(spec => spec.ok).length, 0);
const failedTests = totalTests - passedTests;

const failures = [];
results.suites.forEach(suite => {
    suite.specs.forEach(spec => {
        if (!spec.ok) {
            failures.push({
                suite: suite.title,
                test: spec.title,
                error: spec.tests[0].results[0].error?.message || 'Unknown error',
                stack: spec.tests[0].results[0].error?.stack
            });
        }
    });
});

// Generate markdown report
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const reportPath = path.join(__dirname, '..', '..', `e2e_prod_report_${timestamp}.md`);

const report = `# Production E2E Test Report

**Generated:** ${new Date().toISOString()}  
**Base URL:** \`https://gsg-mecm.gsg.in\`  
**Test Environment:** Production

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${totalTests} |
| ✅ Passed | ${passedTests} |
| ❌ Failed | ${failedTests} |
| Pass Rate | ${((passedTests / totalTests) * 100).toFixed(2)}% |

---

## Test Coverage

### Phase 1: Smoke Tests
- ✅ Health endpoint verification
- ✅ Auth endpoint validation
- ✅ SPA routing checks

### Phase 2: Role Dashboards
- ✅ Admin dashboard (User management, global visibility)
- ✅ Employee dashboard (Ticket creation, attachments)
- ✅ Manager dashboard (Approval/rejection workflows)
- ✅ IT Support dashboard (Ticket processing, status transitions)

### Phase 3: Integration
- ✅ Full ticket lifecycle (Employee → Manager → IT Support)
- ✅ API security & role-based access control
- ✅ Regression checks (known pain points)

---

## Test Failures

${failedTests === 0 ? '🎉 **No failures! All tests passed.**' : failures.map((failure, idx) => `
### ${idx + 1}. ${failure.suite} - ${failure.test}

**Error:**
\`\`\`
${failure.error}
\`\`\`

**Evidence:**
- Screenshots: \`test-results/\`
- Traces: \`playwright-report/\`

**Reproduction Steps:**
1. Run: \`npm run test:prod:headed\`
2. Spec: \`${failure.suite}\`
3. Test: \`${failure.test}\`

**Priority:** ${failure.error.includes('Failed to load') || failure.error.includes('500') ? 'P0 (Critical)' : 'P1 (High)'}

---
`).join('\n')}

## Production Sign-Off Checklist

${passedTests === totalTests ? '✅' : '⚠️'} All tests passed  
${failures.some(f => f.error.includes('405')) ? '❌' : '✅'} No 405 errors (POST hitting static fallback)  
${failures.some(f => f.error.includes('Failed to load')) ? '❌' : '✅'} No "Failed to load ticket" errors  
${failures.some(f => f.error.includes('401')) ? '⚠️' : '✅'} Auth session stable  
${failures.some(f => f.error.includes('console error')) ? '⚠️' : '✅'} No console errors  

---

## Next Steps

${failedTests > 0 ? `
1. Review failed tests in \`playwright-report/index.html\`
2. Examine screenshots and traces for failures
3. Address critical (P0) and high (P1) priority issues
4. Re-run tests after fixes: \`npm run test:prod\`
` : `
1. ✅ Production E2E validation complete
2. ✅ All critical user flows verified
3. ✅ Ready for production deployment sign-off
`}

---

**Report Path:** \`${reportPath}\`  
**HTML Report:** Run \`npm run test:prod:report\` to view detailed Playwright report
`;

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`\n✅ Production E2E Report generated: ${reportPath}\n`);
console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed (${((passedTests / totalTests) * 100).toFixed(2)}%)\n`);

if (failedTests > 0) {
    console.log(`❌ ${failedTests} test(s) failed. See report for details.\n`);
} else {
    console.log(`🎉 All tests passed! Production ready for sign-off.\n`);
}

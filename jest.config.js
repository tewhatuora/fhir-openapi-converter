const { TEST_REPORT, OS } = process.env;
const shouldReport = TEST_REPORT === 'true';

const outputPath = OS ? `report-${OS}.html` : `report.html`;
// Default reporters array
const reporters = ['default'];

// Conditionally add the HTML reporter if running in CI
if (shouldReport) {
  reporters.push([
    'jest-html-reporter',
    {
      pageTitle: 'Test Report',
      outputPath,
      includeFailureMsg: true,
    },
  ]);
}

const config = {
  reporters: reporters,
};
module.exports = config;

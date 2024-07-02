const { getFHIRArtifacts } = require('../src/utils');
const { main } = require('../src/main');
const { getTestConfig } = require('./utils');
const { CAPABILITY_STATEMENT_URL } = require('../src/constants');

jest.mock('../src/utils', () => ({
  getFHIRArtifacts: jest.fn(),
}));

describe('Converter input validation tests', () => {
  test('should throw an error if no capability statements are found', async () => {
    getFHIRArtifacts.mockResolvedValue({
      capabilityStatements: [],
    });
    let error;
    try {
      await main(getTestConfig());
    } catch (e) {
      error = e;
    }
    expect(error.message).toContain(
      `No CapabilityStatements found matching ${CAPABILITY_STATEMENT_URL}`
    );
  });
});

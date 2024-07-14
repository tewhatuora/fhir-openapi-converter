const OpenAPIParser = require('@readme/openapi-parser');
const { main } = require('../src/main');
const { getTestConfig } = require('./utils');

describe('e2e tool tests using example-artifacts', () => {
  let apiSpec;
  beforeAll(async () => {
    apiSpec = await main(getTestConfig());
  });

  test('should generate a consistent JSON files', async () => {
    expect(apiSpec).toMatchSnapshot();
  });
});

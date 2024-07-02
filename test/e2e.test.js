const OpenAPIParser = require('@readme/openapi-parser');
const { main } = require('../src/main');
const { getTestConfig } = require('./utils');

describe('e2e tool tests using example-artifacts', () => {
  let oas;
  beforeAll(async () => {
    const apiSpec = await main(getTestConfig());
    oas = await OpenAPIParser.parse(apiSpec);
  });

  describe('General Requirements', () => {
    test.todo('More tests');
  });
});

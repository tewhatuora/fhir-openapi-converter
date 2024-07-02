const OpenAPIParser = require('@readme/openapi-parser');
const utils = require('../src/utils');
const { getTestConfig, updateCustomHeaders } = require('./utils');

describe('Custom HTTP Headers', () => {
  let main;
  let originalGetFHIRArtifacts;
  const config = getTestConfig();

  beforeAll(() => {
    // Capture the original getFHIRArtifacts function
    originalGetFHIRArtifacts = utils.getFHIRArtifacts.bind(utils);
    jest.spyOn(utils, 'getFHIRArtifacts');
    ({ main } = require('../src/main'));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should add custom headers to all operations', async () => {
    const apiSpec = await main(config);
    const oas = await OpenAPIParser.parse(apiSpec);
    Object.keys(oas.paths).forEach((path) => {
      Object.keys(oas.paths[path]).forEach((method) => {
        const operation = oas.paths[path][method];
        expect(operation.parameters).toBeDefined();
        const customHeader = operation.parameters.find(
          (p) => p.name === 'Correlation-Id'
        );
        expect(customHeader).toBeDefined();
        expect(customHeader.in).toEqual('header');
        expect(customHeader.schema.type).toEqual('string');
        expect(customHeader.required).toEqual(true);
      });
    });
  });

  test('should respect the custom headers required annotation', async () => {
    // return a Request-Context header that is not required
    utils.getFHIRArtifacts.mockImplementationOnce(() =>
      updateCustomHeaders(
        originalGetFHIRArtifacts,
        config,
        'Request-Context',
        false
      )
    );
    const apiSpec = await main(config);
    const oas = await OpenAPIParser.parse(apiSpec);
    Object.keys(oas.paths).forEach((path) => {
      Object.keys(oas.paths[path]).forEach((method) => {
        const operation = oas.paths[path][method];
        expect(operation.parameters).toBeDefined();
        const customHeader = operation.parameters.find(
          (p) => p.name === 'Request-Context'
        );
        expect(customHeader.required).toEqual(false);
      });
    });
  });
});

const OpenAPIParser = require('@readme/openapi-parser');
const { main } = require('../src/main');
const { getTestConfig } = require('./utils');
const capabilitySeedData = require('../example-artifacts/fsh-generated/resources/CapabilityStatement-ExampleCapabilityStatement.json');

describe('Custom operations', () => {
  let oas;
  beforeAll(async () => {
    const apiSpec = await main(getTestConfig());
    oas = await OpenAPIParser.parse(apiSpec);
  });

  test('custom query type operation for system should create a GET /$custom-operation path', async () => {
    // confirm seed data for system operation
    expect(capabilitySeedData.rest[0].operation).toEqual([
      {
        name: 'summary',
        definition:
          'https://example.com/OperationDefinition/ExampleSystemOperationDefinition',
      },
    ]);
    // confirm generated path
    expect(oas.paths['/$summary']['get']['tags']).toContain('system');
  });

  test('custom query type operation for a type should create a GET /{resource}/$custom-operation path', async () => {
    // confirm seed data for system operation
    expect(capabilitySeedData.rest[0].operation).toEqual([
      {
        name: 'summary',
        definition:
          'https://example.com/OperationDefinition/ExampleSystemOperationDefinition',
      },
    ]);
    // confirm generated path
    expect(oas.paths['/$summary']).toHaveProperty('get');
  });

  test('custom operation type operation for a type should create a POST /{resource}/$custom-operation path', async () => {
    // confirm seed data for system operation
    expect(capabilitySeedData.rest[0].resource[0].operation).toEqual(
      expect.arrayContaining([
        {
          name: 'match',
          definition:
            'https://example.com/OperationDefinition/ExampleOperationModeOperationDefinition',
        },
      ])
    );
    // confirm generated path
    expect(oas.paths['/Patient/$match']).toHaveProperty('post');
  });
});

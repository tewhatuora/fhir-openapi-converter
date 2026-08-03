const OpenAPIParser = require('@readme/openapi-parser');
const { main } = require('../src/main');
const { getCustomOperation } = require('../src/oas/operations');
const { getTestConfig } = require('./utils');
const capabilitySeedData = require('../example-artifacts/fsh-generated/resources/CapabilityStatement-ExampleCapabilityStatementSMART.json');

describe('Custom operations', () => {
  let oas;
  beforeAll(async () => {
    const apiSpec = await main(getTestConfig());
    oas = await OpenAPIParser.parse(
      apiSpec.find(
        (spec) =>
          spec['x-capabilitystatement-id'] === 'ExampleCapabilityStatementSMART'
      )
    );
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

  describe('responses', () => {
    const operationUrl = 'https://example.com/OperationDefinition/test';
    const getResponse = (outParams) => {
      const operationDefinition = {
        resourceType: 'OperationDefinition',
        url: operationUrl,
        name: 'TestOperation',
        code: 'test',
        kind: 'operation',
        parameter: outParams,
      };
      const config = {
        contentType: ['application/json', 'application/fhir+json'],
        defaultResponses: '400',
        igFiles: { [operationUrl]: operationDefinition },
      };

      return getCustomOperation(
        config,
        { name: 'test', definition: operationUrl },
        'system'
      ).oas.post.responses[200];
    };

    test('returns a single resource output named return directly', () => {
      const response = getResponse([
        {
          name: 'return',
          use: 'out',
          type: 'OperationOutcome',
          documentation: 'The operation result',
        },
      ]);

      expect(response.description).toBe('Successful response');
      expect(response.content['application/fhir+json'].schema).toEqual({
        $ref: expect.stringMatching(/OperationOutcome-definition\.json$/),
      });
    });

    test('wraps a named primitive output in a Parameters resource', () => {
      const response = getResponse([
        {
          name: 'participationIndicator',
          use: 'out',
          type: 'boolean',
        },
      ]);

      expect(response.content['application/fhir+json'].schema).toMatchObject({
        type: 'object',
        properties: {
          resourceType: { enum: ['Parameters'] },
        },
      });
      expect(JSON.stringify(response)).not.toContain('boolean-definition.json');
    });

    test('wraps multiple named outputs in a Parameters resource', () => {
      const response = getResponse([
        { name: 'patient', use: 'out', type: 'Reference' },
        { name: 'participating', use: 'out', type: 'boolean' },
      ]);

      expect(response.content['application/json'].schema).toMatchObject({
        properties: {
          resourceType: { enum: ['Parameters'] },
        },
      });
      expect(JSON.stringify(response)).not.toContain(
        'Reference-definition.json'
      );
    });

    test('omits response content when the operation has no outputs', () => {
      expect(getResponse([])).toEqual({
        description: 'Successful response',
      });
    });
  });
});

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

  describe('HTTP method', () => {
    const operationUrl = 'https://example.com/OperationDefinition/test';
    const getOperation = (overrides = {}) => {
      const operationDefinition = {
        resourceType: 'OperationDefinition',
        url: operationUrl,
        name: 'TestOperation',
        code: 'test',
        kind: 'operation',
        ...overrides,
      };
      const config = {
        contentType: ['application/fhir+json'],
        defaultResponses: '400',
        igFiles: { [operationUrl]: operationDefinition },
      };

      return getCustomOperation(
        config,
        { name: 'test', definition: operationUrl },
        'Patient'
      ).oas;
    };

    test('uses GET for a read-only operation with primitive input parameters', () => {
      const operation = getOperation({
        affectsState: false,
        parameter: [
          {
            name: '_count',
            use: 'in',
            min: 0,
            max: '1',
            type: 'integer',
            documentation: 'Maximum number of results.',
          },
          { name: 'return', use: 'out', min: 1, max: '1', type: 'Bundle' },
        ],
      });

      expect(operation).toHaveProperty('get');
      expect(operation).not.toHaveProperty('post');
      expect(operation.get).not.toHaveProperty('requestBody');
      expect(operation.get.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '_count',
            in: 'query',
            required: false,
          }),
        ])
      );
    });

    test('uses POST when a read-only operation has a complex input parameter', () => {
      const operation = getOperation({
        affectsState: false,
        parameter: [
          { name: 'patient', use: 'in', min: 1, max: '1', type: 'Reference' },
        ],
      });

      expect(operation).toHaveProperty('post');
      expect(operation).not.toHaveProperty('get');
    });

    test('uses POST when affectsState is true', () => {
      const operation = getOperation({
        affectsState: true,
        parameter: [
          { name: 'value', use: 'in', min: 0, max: '1', type: 'string' },
        ],
      });

      expect(operation).toHaveProperty('post');
      expect(operation).not.toHaveProperty('get');
    });
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

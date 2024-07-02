const OpenAPIParser = require('@readme/openapi-parser');
const { main } = require('../src/main');
const { getTestConfig } = require('./utils');

describe('OpenAPI HNZ Publishing Standards Tests', () => {
  let oas;
  beforeAll(async () => {
    const apiSpec = await main(getTestConfig());
    oas = await OpenAPIParser.parse(apiSpec);
  });

  describe('General Requirements', () => {
    test.todo(
      'Property descriptions - Specification authors MUST provide descriptions for all properties'
    );
  });

  describe('Info Section Requirements', () => {
    test('info.title MUST be present', async () => {
      expect(oas.info.title).toBeDefined();
    });

    test('info.description MUST be present', async () => {
      expect(oas.info.description).toBeDefined();
    });

    test('info.license - info.license.name and info.license.url MUST be present', async () => {
      expect(oas.info.license.name).toBeDefined();
      expect(oas.info.license.url).toBeDefined();
    });

    test('info.version MUST be present', async () => {
      expect(oas.info.version).toBeDefined();
    });

    test('info.contact - info.contact.name and info.contact.url MUST be present', async () => {
      expect(oas.info.contact.name).toBeDefined();
      expect(oas.info.contact.url).toBeDefined();
    });
  });

  describe('Servers Section Requirements', () => {
    test('servers MUST be present', async () => {
      expect(oas.servers.length).toBeGreaterThan(0);
    });
  });

  describe('External Documentation Requirements', () => {
    test('externalDocs MUST be present for FHIR APIs', async () => {
      expect(oas.externalDocs).toBeDefined();
    });
  });

  describe('Paths Section Requirements', () => {
    test('Paths - All defined paths MUST have a summary and description', async () => {
      expect(oas.paths).toBeDefined();
      Object.keys(oas.paths).forEach((path) => {
        Object.keys(oas.paths[path]).forEach((method) => {
          expect(oas.paths[path][method].summary).toBeDefined();
          expect(oas.paths[path][method].description).toBeDefined();
        });
      });
    });

    test('Operations - Each operation MUST have a unique operationId', async () => {
      const operationIds = [];
      expect(oas.paths).toBeDefined();
      Object.keys(oas.paths).forEach((path) => {
        Object.keys(oas.paths[path]).forEach((method) => {
          if (operationIds.includes(oas.paths[path][method].operationId)) {
            throw new Error(
              `Duplicate operationId found: ${oas.paths[path][method].operationId}`
            );
          } else {
            operationIds.push(oas.paths[path][method].operationId);
          }
        });
      });
      expect(operationIds.length).toBeGreaterThan(0);
    });
  });

  describe('Request body Requirements', () => {
    test('Request body - MUST be provided for POST, PUT, PATCH verbs and MUST NOT for GET, DELETE, HEAD, OPTIONS', async () => {
      Object.keys(oas.paths).forEach((path) => {
        Object.keys(oas.paths[path]).forEach((method) => {
          const requestBody = oas.paths[path][method].requestBody;
          if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
            expect(requestBody).toBeDefined();
          } else if (
            ['get', 'delete', 'head', 'options'].includes(method.toLowerCase())
          ) {
            expect(requestBody).toBeUndefined();
          }
        });
      });
    });
  });

  describe('Response Requirements', () => {
    test('Responses - A list of responses MUST be provided for all operations', async () => {
      Object.keys(oas.paths).forEach((path) => {
        Object.keys(oas.paths[path]).forEach((method) => {
          expect(oas.paths[path][method].responses).toBeDefined();
          expect(
            Object.keys(oas.paths[path][method].responses).length
          ).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Components Section Requirements', () => {
    test.todo(
      'Parameters - OpenAPI specifications SHOULD define reusable parameters'
    );

    test('Schemas - OpenAPI specifications SHOULD use schema references to define content', async () => {
      expect(oas.components.schemas).toBeDefined();
    });

    test('Examples - OpenAPI specifications SHOULD define reusable examples', async () => {
      expect(oas.components.examples).toBeDefined();
    });
  });

  describe('Validation Requirements', () => {
    test('The OpenAPI document MUST pass validation against the OpenAPI specification', async () => {
      await OpenAPIParser.parse(oas);
    });
  });
});

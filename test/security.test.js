const OpenAPIParser = require('@readme/openapi-parser');
const utils = require('../src/utils');
const {
  getTestConfig,
  getSmartSystemSecurity,
  getSmartUserSecurity,
  getOauthSecurity,
} = require('./utils');

describe('Security', () => {
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

  describe('SMART on FHIR', () => {
    test('should annotate SMART on FHIR system scopes when the official extension is used', async () => {
      utils.getFHIRArtifacts.mockImplementationOnce(async () => {
        const modifiedArtifacts = await originalGetFHIRArtifacts(config);
        const originalCapabilityStatement =
          modifiedArtifacts.capabilityStatements.find(
            (capstmt) => capstmt['id'] === 'ExampleCapabilityStatementSMART'
          );
        originalCapabilityStatement.rest[0].security = getSmartSystemSecurity([
          'client-confidential-symmetric',
        ]);
        modifiedArtifacts.capabilityStatements[0] = originalCapabilityStatement;
        return modifiedArtifacts;
      });

      const apiSpec = await main(config);
      const oas = await OpenAPIParser.parse(
        apiSpec.find(
          (spec) =>
            spec['x-capabilitystatement-id'] ===
            'ExampleCapabilityStatementSMART'
        )
      );

      expect(oas.components.securitySchemes.smartOnFhir.type).toEqual('oauth2');
      expect(oas.components.securitySchemes.smartOnFhir.description).toEqual(
        'SMART-on-FHIR security scheme'
      );
      expect(
        Object.keys(oas.components.securitySchemes.smartOnFhir.flows).length
      ).toEqual(1);
      expect(
        oas.components.securitySchemes.smartOnFhir.flows.clientCredentials
      ).toBeDefined();
      const { scopes } =
        oas.components.securitySchemes.smartOnFhir.flows.clientCredentials;
      Object.keys(scopes).forEach((s) =>
        expect(s.startsWith('system/') || s.startsWith('http')).toEqual(true)
      );

      const readOperation = oas.paths['/Patient/{rid}'].get;
      expect(readOperation.security[0].smartOnFhir).toEqual([
        'system/Patient.r',
      ]);

      const createOperation = oas.paths['/Patient'].post;
      expect(createOperation.security[0].smartOnFhir).toEqual([
        'system/Patient.c',
      ]);

      const searchOperation = oas.paths['/Patient'].get;
      expect(searchOperation.security[0].smartOnFhir).toEqual([
        'system/Patient.s',
      ]);

      const deleteOperation = oas.paths['/Patient/{rid}'].delete;
      expect(deleteOperation.security[0].smartOnFhir).toEqual([
        'system/Patient.d',
      ]);

      const vreadOperation = oas.paths['/Encounter/{rid}/_history/{vid}'].get;
      expect(vreadOperation.security[0].smartOnFhir).toEqual([
        'system/Encounter.r',
      ]);
    });

    test('should annotate SMART on FHIR system scopes for custom operations', async () => {
      utils.getFHIRArtifacts.mockImplementationOnce(async () => {
        const modifiedArtifacts = await originalGetFHIRArtifacts(config);
        const originalCapabilityStatement =
          modifiedArtifacts.capabilityStatements.find(
            (capstmt) => capstmt['id'] === 'ExampleCapabilityStatementSMART'
          );
        originalCapabilityStatement.rest[0].security = getSmartSystemSecurity([
          'client-confidential-symmetric',
        ]);
        modifiedArtifacts.capabilityStatements[0] = originalCapabilityStatement;
        return modifiedArtifacts;
      });

      const apiSpec = await main(config);
      const oas = await OpenAPIParser.parse(
        apiSpec.find(
          (spec) =>
            spec['x-capabilitystatement-id'] ===
            'ExampleCapabilityStatementSMART'
        )
      );

      expect(oas.components.securitySchemes.smartOnFhir.type).toEqual('oauth2');
      expect(oas.components.securitySchemes.smartOnFhir.description).toEqual(
        'SMART-on-FHIR security scheme'
      );
      expect(
        Object.keys(oas.components.securitySchemes.smartOnFhir.flows).length
      ).toEqual(1);
      expect(
        oas.components.securitySchemes.smartOnFhir.flows.clientCredentials
      ).toBeDefined();
      const { scopes } =
        oas.components.securitySchemes.smartOnFhir.flows.clientCredentials;
      Object.keys(scopes).forEach((s) =>
        expect(s.startsWith('system/') || s.startsWith('http')).toEqual(true)
      );

      const summaryOperation = oas.paths['/Patient/$summary'].get;
      expect(summaryOperation.security[0].smartOnFhir).toEqual([
        'https://example.com/OperationDefinition/ExampleQueryOperationDefinition',
      ]);
    });

    test('should annotate SMART on FHIR user scopes when the official extension is used', async () => {
      utils.getFHIRArtifacts.mockImplementationOnce(async () => {
        const modifiedArtifacts = await originalGetFHIRArtifacts(config);
        const originalCapabilityStatement =
          modifiedArtifacts.capabilityStatements.find(
            (capstmt) => capstmt['id'] === 'ExampleCapabilityStatementSMART'
          );
        originalCapabilityStatement.rest[0].security = getSmartUserSecurity([
          'permission-user',
        ]);
        modifiedArtifacts.capabilityStatements[0] = originalCapabilityStatement;
        return modifiedArtifacts;
      });

      const apiSpec = await main(config);
      const oas = await OpenAPIParser.parse(
        apiSpec.find(
          (spec) =>
            spec['x-capabilitystatement-id'] ===
            'ExampleCapabilityStatementSMART'
        )
      );

      expect(oas.components.securitySchemes.smartOnFhir.type).toEqual('oauth2');
      expect(oas.components.securitySchemes.smartOnFhir.description).toEqual(
        'SMART-on-FHIR security scheme'
      );
      expect(
        Object.keys(oas.components.securitySchemes.smartOnFhir.flows).length
      ).toEqual(1);
      expect(
        oas.components.securitySchemes.smartOnFhir.flows.authorizationCode
      ).toBeDefined();
      const { scopes } =
        oas.components.securitySchemes.smartOnFhir.flows.authorizationCode;
      Object.keys(scopes).forEach((s) =>
        expect(s.startsWith('user/') || s.startsWith('http')).toEqual(true)
      );

      const readOperation = oas.paths['/Patient/{rid}'].get;
      expect(readOperation.security[0].smartOnFhir).toEqual(['user/Patient.r']);

      const createOperation = oas.paths['/Patient'].post;
      expect(createOperation.security[0].smartOnFhir).toEqual([
        'user/Patient.c',
      ]);

      const searchOperation = oas.paths['/Patient'].get;
      expect(searchOperation.security[0].smartOnFhir).toEqual([
        'user/Patient.s',
      ]);

      const deleteOperation = oas.paths['/Patient/{rid}'].delete;
      expect(deleteOperation.security[0].smartOnFhir).toEqual([
        'user/Patient.d',
      ]);

      const vreadOperation = oas.paths['/Encounter/{rid}/_history/{vid}'].get;
      expect(vreadOperation.security[0].smartOnFhir).toEqual([
        'user/Encounter.r',
      ]);
    });

    test('should annotate SMART on FHIR patient scopes when the official extension is used', async () => {
      utils.getFHIRArtifacts.mockImplementationOnce(async () => {
        const modifiedArtifacts = await originalGetFHIRArtifacts(config);
        const originalCapabilityStatement =
          modifiedArtifacts.capabilityStatements.find(
            (capstmt) => capstmt['id'] === 'ExampleCapabilityStatementSMART'
          );
        originalCapabilityStatement.rest[0].security = getSmartUserSecurity([
          'permission-patient',
        ]);
        modifiedArtifacts.capabilityStatements[0] = originalCapabilityStatement;
        return modifiedArtifacts;
      });

      const apiSpec = await main(config);
      const oas = await OpenAPIParser.parse(
        apiSpec.find(
          (spec) =>
            spec['x-capabilitystatement-id'] ===
            'ExampleCapabilityStatementSMART'
        )
      );

      expect(oas.components.securitySchemes.smartOnFhir.type).toEqual('oauth2');
      expect(oas.components.securitySchemes.smartOnFhir.description).toEqual(
        'SMART-on-FHIR security scheme'
      );
      expect(
        Object.keys(oas.components.securitySchemes.smartOnFhir.flows).length
      ).toEqual(1);
      expect(
        oas.components.securitySchemes.smartOnFhir.flows.authorizationCode
      ).toBeDefined();
      const { scopes } =
        oas.components.securitySchemes.smartOnFhir.flows.authorizationCode;
      Object.keys(scopes).forEach((s) =>
        expect(s.startsWith('patient/') || s.startsWith('http')).toEqual(true)
      );

      const readOperation = oas.paths['/Patient/{rid}'].get;
      expect(readOperation.security[0].smartOnFhir).toEqual([
        'patient/Patient.r',
      ]);

      const createOperation = oas.paths['/Patient'].post;
      expect(createOperation.security[0].smartOnFhir).toEqual([
        'patient/Patient.c',
      ]);

      const searchOperation = oas.paths['/Patient'].get;
      expect(searchOperation.security[0].smartOnFhir).toEqual([
        'patient/Patient.s',
      ]);

      const deleteOperation = oas.paths['/Patient/{rid}'].delete;
      expect(deleteOperation.security[0].smartOnFhir).toEqual([
        'patient/Patient.d',
      ]);

      const vreadOperation = oas.paths['/Encounter/{rid}/_history/{vid}'].get;
      expect(vreadOperation.security[0].smartOnFhir).toEqual([
        'patient/Encounter.r',
      ]);
    });
  });

  describe('oAuth', () => {
    test('oAuth', async () => {
      const apiSpec = await main(config);
      const oas = await OpenAPIParser.parse(
        apiSpec.find(
          (spec) =>
            spec['x-capabilitystatement-id'] ===
            'ExampleCapabilityStatementOauth'
        )
      );

      expect(oas.components.securitySchemes.OAuth.type).toEqual('oauth2');
      expect(oas.components.securitySchemes.OAuth.description).toEqual(
        'OAuth security scheme'
      );
      expect(
        Object.keys(oas.components.securitySchemes.OAuth.flows).length
      ).toEqual(2);
      expect(
        oas.components.securitySchemes.OAuth.flows.clientCredentials
      ).toBeDefined();
      const { scopes } =
        oas.components.securitySchemes.OAuth.flows.clientCredentials;
      expect(Object.keys(scopes)).toEqual(['scope/example']);
    });
  });
});

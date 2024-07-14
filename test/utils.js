const { execSync } = require('child_process');
const { CAPABILITY_STATEMENT_URL } = require('../src/constants');
const { types } = require('util');

// Helper function to run the CLI tool
const runCliTool = (opts) => {
  // Convert options object to command line arguments
  const args = Object.entries(opts)
    .map(([key, value]) => `--${key} "${value}"`)
    .join(' ');
  const command = `./src/cli.js ${args}`;
  const result = execSync(command, { encoding: 'utf-8' });
  return result;
};

const getTestConfig = () => {
  const inputFolder = `./example-artifacts`;
  const defaultResponses = '400,401,403,500';
  const defaultOAuthScope = 'scope/example';
  return {
    inputFolder,
    defaultOAuthScope,
    disableOutputFiles: true,
    defaultResponses,
    contentType: 'application/json',
  };
};

const getStuctureDefinition = (elementDefinition, resourceType) => {
  return {
    type: resourceType,
    differential: {
      element: [elementDefinition],
    },
  };
};

const getMinimalCapabilityStatement = (
  resource,
  resourceInteractions,
  systemInteractions
) => {
  return {
    rest: [
      {
        mode: 'server',
        ...(systemInteractions
          ? {
              interaction: systemInteractions.map((i) => {
                return { code: i };
              }),
            }
          : {}),
        ...(resource
          ? {
              resource: [
                {
                  type: resource,
                  ...(resourceInteractions
                    ? {
                        interaction: resourceInteractions.map((i) => {
                          return { code: i };
                        }),
                      }
                    : {}),
                },
              ],
            }
          : {}),
      },
    ],
    meta: {
      profile: [CAPABILITY_STATEMENT_URL],
    },
  };
};

const getSmartSystemSecurity = (types) => {
  const annotation = {
    service: [
      {
        coding: [
          {
            code: 'SMART-on-FHIR',
          },
        ],
      },
    ],
    extension: [
      {
        url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
        extension: [
          {
            url: 'token',
            valueUri: 'https://auth.example.com/oauth2/token',
          },
        ],
      },
    ],
  };
  types.forEach((type) => {
    annotation.extension.push({
      url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities',
      valueCode: type,
    });
  });
  return annotation;
};

const getSmartUserSecurity = (types) => {
  const annotation = {
    service: [
      {
        coding: [
          {
            code: 'SMART-on-FHIR',
          },
        ],
      },
    ],
    extension: [
      {
        url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
        extension: [
          {
            url: 'authorize',
            valueUri: 'https://auth.example.com/oauth2/authorize',
          },
        ],
      },
    ],
  };
  types.forEach((type) => {
    annotation.extension.push({
      url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities',
      valueCode: type,
    });
  });
  return annotation;
};

const getOauthSecurity = () => {
  return {
    service: [
      {
        coding: [
          {
            code: 'OAuth',
          },
        ],
      },
    ],
    extension: [
      {
        url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
        extension: [
          {
            url: 'token',
            valueUri: 'https://auth.example.com/oauth2/token',
          },
        ],
      },
    ],
  };
};

async function updateCustomHeaders(
  originalGetFHIRArtifactsFn,
  config,
  headerName = 'Correlation-Id',
  isRequired = true
) {
  const modifiedArtifacts = await originalGetFHIRArtifactsFn(config);
  const originalCapabilityStatement =
    modifiedArtifacts.capabilityStatements.find(
      (cpstmt) => cpstmt['id'] === 'ExampleCapabilityStatementSMART'
    );

  // Navigate and find the relevant extensions
  const resourceMetadataExtension = originalCapabilityStatement.extension.find(
    (ext) =>
      ext.url ===
      'https://fhir-ig.digital.health.nz/hnz-digital-tooling/StructureDefinition/resource-metadata-extension'
  );

  const globalHeadersExtension = resourceMetadataExtension.extension.find(
    (ext) => ext.url === 'globalHeaders'
  );

  const customHeadersExtension = globalHeadersExtension.extension.find(
    (ext) =>
      ext.url ===
      'https://fhir-ig.digital.health.nz/hnz-digital-tooling/StructureDefinition/custom-headers-extension'
  );

  // Modify the custom header name and required status
  const headerNameField = customHeadersExtension.extension.find(
    (ext) => ext.url === 'key'
  );
  if (headerNameField) {
    headerNameField.valueString = headerName; // Update the header name
  }

  const requiredField = customHeadersExtension.extension.find(
    (ext) => ext.url === 'required'
  );
  if (requiredField) {
    requiredField.valueBoolean = isRequired; // Set the required status
  }

  return modifiedArtifacts;
}

module.exports = {
  getMinimalCapabilityStatement,
  getOauthSecurity,
  getSmartSystemSecurity,
  getSmartUserSecurity,
  getStuctureDefinition,
  getTestConfig,
  runCliTool,
  updateCustomHeaders,
};

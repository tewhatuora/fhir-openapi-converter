const logger = require('./logger');
const _ = require('lodash');
const { buildPaths } = require('./oas/paths');
const { deduplicateTopLevelProperties } = require('./de-dupe-schemas');
const {
  convertFhirSecurityToOpenApi,
  extractOAuthScopes,
  transformScopesToObject,
} = require('./oas/security');
const { extractCustomExtensions } = require('./oas/customExtensions');

const generateOpenApiSpec = async (config, capabilityStatement) => {
  const customCapabilityStatementDetails =
    extractCustomExtensions(capabilityStatement);
  const { securitySchemes, smartFeatures } = convertFhirSecurityToOpenApi(
    capabilityStatement?.rest?.[0].security
  );
  const mergedConfig = {
    ...config,
    smartFeatures,
    securitySchemes,
    globalHeaders: customCapabilityStatementDetails.globalHeaders,
  };
  const contact = _.find(capabilityStatement.contact, (contact) =>
    _.find(contact.telecom, { system: 'url' })
  );
  const oas = {
    openapi: '3.0.3',
    info: {
      version: capabilityStatement.version,
      title: capabilityStatement.description,
      description: capabilityStatement.description,
      license: {
        name: customCapabilityStatementDetails.licenseName,
        url: customCapabilityStatementDetails.licenseURL,
      },
      contact: {
        name: contact?.name,
        url: contact?.telecom[0].value,
      },
    },
    externalDocs: {
      url: customCapabilityStatementDetails.externalDocs,
      description: 'FHIR Implementation Guide',
    },
    servers: [
      {
        url: capabilityStatement?.implementation?.url,
        description: capabilityStatement?.implementation?.description,
      },
    ],
  };
  const { paths, schemas, examples, tags } = await buildPaths(
    mergedConfig,
    capabilityStatement
  );
  if (Object.keys(paths || {})?.length) {
    oas.paths = paths;
  }
  if (schemas.length) {
    const schemaObject = schemas.reduce((acc, schema) => {
      const key = `${schema.fhir?.resourceType}-${schema.fhir?.id}`;
      acc[key] = { ...schema.oas };
      return acc;
    }, {});
    _.set(oas, 'components.schemas', schemaObject);
  }

  if (Object.keys(securitySchemes).length) {
    _.set(oas, 'components.securitySchemes', securitySchemes);
    const operationScopes = extractOAuthScopes(oas, 'smartOnFhir');
    if (
      oas.components?.securitySchemes?.smartOnFhir?.flows?.clientCredentials
    ) {
      oas.components.securitySchemes.smartOnFhir.flows.clientCredentials.scopes =
        transformScopesToObject(
          operationScopes.filter(
            (scope) => scope.startsWith('system') || scope.startsWith('http')
          )
        );
    }
    if (
      oas.components?.securitySchemes?.smartOnFhir?.flows?.authorizationCode
        ?.scopes
    ) {
      oas.components.securitySchemes.smartOnFhir.flows.authorizationCode.scopes =
        transformScopesToObject(
          operationScopes.filter(
            (scope) =>
              scope.startsWith('patient') ||
              scope.startsWith('user') ||
              scope.startsWith('http')
          )
        );
    }
  }

  if (tags.length) {
    const detailedTags = tags.map((tag) => ({
      name: tag,
      description: `Operations related to ${tag} FHIR resource`,
      externalDocs: {
        url: `https://www.hl7.org/fhir/${tag.toLowerCase()}.html`,
      },
    }));
    _.set(oas, 'tags', detailedTags);
  }

  const exampleKeys = Object.keys(examples);
  if (exampleKeys.length) {
    const exampleSchemas = {};

    Object.keys(config.igFiles.examples).forEach((url) => {
      // Assume examples are an array, though typically would need to handle different structures
      const examplesArray = config.igFiles.examples[url];

      examplesArray.forEach((example) => {
        // Construct the key expected in the 'examples' object
        const expectedKey = `${example.resourceType}-${example.id}`;
        // Check if this key is present in the keys logged earlier
        if (exampleKeys.includes(expectedKey)) {
          // Assign the example to the schema object under the formatted key
          exampleSchemas[expectedKey] = { value: example };
        }
      });
    });
    // Use lodash's set function to update the OpenAPI spec object
    _.set(oas, 'components.examples', exampleSchemas);
  }

  if (config.dedupeSchemas) {
    logger.debug('De-duping schemeas');
    _.set(
      oas,
      'components.schemas',
      deduplicateTopLevelProperties(oas.components.schemas)
    );
  }

  return oas;
};

module.exports = { generateOpenApiSpec };

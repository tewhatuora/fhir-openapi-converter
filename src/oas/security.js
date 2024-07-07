const logger = require('../logger');
const _ = require('lodash');

/**
 * Converts FHIR security information into OpenAPI security schemes.
 * @param {Object} security - FHIR security configuration object.
 * @returns {Object} Object containing OpenAPI security schemes and SMART features.
 */
const convertFhirSecurityToOpenApi = (security) => {
  const allSecuritySchemes = {};
  let smartFeatures = [];
  if (security?.service?.length) {
    security.service?.forEach((service) => {
      if (service.coding[0].code === 'SMART-on-FHIR') {
        logger.debug('Found SMART-on-FHIR security scheme');
        allSecuritySchemes['smartOnFhir'] = convertOauthSecurityToOpenApi(
          service.coding[0].code,
          security
        );
        smartFeatures = getSMARTScopeBases(security);
      } else if (service.coding[0].code === 'OAuth') {
        logger.debug('Found OAuth security scheme');
        allSecuritySchemes['OAuth'] = convertOauthSecurityToOpenApi(
          service.coding[0].code,
          security
        );
      } else {
        logger.debug('Found unknown security scheme');
      }
    });
  } else {
    logger.debug('No security schemes found in CapabilityStatement');
  }
  return {
    securitySchemes: allSecuritySchemes,
    smartFeatures,
  };
};

/**
 * Extracts SMART scope bases from FHIR security configurations.
 * @param {Object} security - FHIR security configuration object.
 * @returns {Array<string>} List of SMART scope bases.
 */
const getSMARTScopeBases = (security) => {
  const capabilities = security?.extension?.filter(
    (ext) =>
      ext.url ===
      'http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities'
  );
  if (!capabilities) {
    logger.debug(
      'No SMART-on-FHIR capabilities found by extension "http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities"'
    );
    return [];
  }
  const smartFeatures = capabilities?.map((capability) => {
    switch (capability.valueCode) {
      case 'client-confidential-symmetric':
        return 'system';
      case 'permission-user':
        return 'user';
      case 'permission-patient':
        return 'patient';
    }
  });
  logger.debug('Found SMART-on-FHIR base scopes', smartFeatures);
  return smartFeatures;
};

const getSMARTScopes = (resourceType, smartFeatures, op) => {
  return smartFeatures.map((feature) => `${feature}/${resourceType}.${op}`);
};

/**
 * Converts OAuth-related information from FHIR into OpenAPI security schemes.
 * @param {string} code - Type of OAuth, e.g., 'SMART-on-FHIR' or 'OAuth'.
 * @param {Object} security - FHIR security configuration object.
 * @returns {Object} OpenAPI security schema for OAuth flows.
 */
const convertOauthSecurityToOpenApi = (code, security) => {
  const openApiSecuritySchema = {
    type: 'oauth2',
    description: `${code} security scheme`,
    flows: {},
  };

  const oauthExtensions = security?.extension?.find(
    (ext) =>
      ext.url ===
      'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
  );

  if (oauthExtensions) {
    const authorizeExt = oauthExtensions.extension.find(
      (ext) => ext.url === 'authorize'
    );
    const tokenExt = oauthExtensions.extension.find(
      (ext) => ext.url === 'token'
    );

    if (authorizeExt) {
      logger.debug('Found OAuth authorization code flow');
      openApiSecuritySchema.flows.authorizationCode = {
        authorizationUrl: authorizeExt.valueUri,
        tokenUrl: tokenExt ? tokenExt.valueUri : '',
        scopes: {},
      };
    }
    if (tokenExt) {
      logger.debug('Found OAuth client credentials code flow');
      openApiSecuritySchema.flows.clientCredentials = {
        tokenUrl: tokenExt.valueUri,
        scopes: {},
      };
    }
  } else {
    logger.debug(
      `Found no oAuth extensions from "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"`
    );
  }
  return openApiSecuritySchema;
};

/**
 * Extracts OAuth scopes from an OpenAPI specification for a specified security name.
 * @param {Object} openApiSpec - OpenAPI specification object.
 * @param {string} securityName - Security scheme name to filter scopes for.
 * @returns {Array<string>} List of unique OAuth scopes.
 */
const extractOAuthScopes = (openApiSpec, securityName) => {
  const scopes = new Set();

  Object.values(openApiSpec.paths).forEach((operations) => {
    Object.values(operations).forEach((operation) => {
      const securitySettings = operation.security || [];
      securitySettings.forEach((security) => {
        const operationScopes = security[securityName] || [];
        operationScopes.forEach((scope) => scopes.add(scope));
      });
    });
  });
  return Array.from(scopes);
};

const transformScopesToObject = (scopes) => {
  return scopes.reduce((acc, scope) => {
    const description = scope.split('/').pop() + ' access';
    acc[scope] =
      `${description.charAt(0).toUpperCase() + description.slice(1)}`;
    return acc;
  }, {});
};

module.exports = {
  convertFhirSecurityToOpenApi,
  extractOAuthScopes,
  getSMARTScopes,
  transformScopesToObject,
};

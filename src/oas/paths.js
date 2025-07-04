const logger = require('../logger');
const {
  renderParameter,
  getPathParameter,
  setGlobalHeaders,
} = require('./parameters');
const { getResponses } = require('./responses');
const { OAS_SCHEMA_BASE_URL } = require('../constants');
const { getExamples } = require('./examples');
const { getRequestBody } = require('./requestBody');
const { addOrUpdatePath } = require('../utils');
const { getSMARTScopes } = require('./security');
const { generateOasSchemasFromProfiles } = require('./profiles');
const { getBundleRequestSchema, getBundleResponseSchema } = require('./bundle');
const { getCustomOperation } = require('./operations');

const buildReadPath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building read path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      get: {
        summary: `Read ${serverResource.type}`,
        description: documentation || `Read ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `read${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ],
        responses: await getResponses(
          config,
          'read',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'r'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildVersionedReadPath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building vread path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}/_history/{vid}`]: {
      get: {
        summary: `Read ${serverResource.type} (versioned)`,
        description: documentation || `Read ${serverResource.type} (versioned)`,
        tags: [serverResource.type],
        operationId: `vread${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
          getPathParameter('vid', 'Resource version id'),
        ],
        responses: await getResponses(
          config,
          'vread',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'r'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildCreatePath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building create path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}`]: {
      post: {
        summary: `Create ${serverResource.type}`,
        description: documentation || `Create ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `create${serverResource.type}`,
        parameters: [...setGlobalHeaders(config)],
        responses: await getResponses(
          config,
          'create',
          serverResource,
          profileSchemas,
          examples
        ),
        requestBody: await getRequestBody(
          config,
          'create',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'c'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildPatchPath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building patch path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      patch: {
        summary: `Patch for ${serverResource.type}`,
        description: documentation || `Patch for ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `patch${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ],
        responses: await getResponses(
          config,
          'patch',
          serverResource,
          profileSchemas,
          examples
        ),
        requestBody: await getRequestBody(
          config,
          'patch',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'u'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildSearchPath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building search path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}`]: {
      get: {
        summary: `Search for ${serverResource.type}`,
        description: documentation || `Search for ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `search${serverResource.type}`,
        parameters: [...setGlobalHeaders(config)].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param, serverResource?.extension)
          )
        ),
        responses: await getResponses(
          config,
          'search',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                's'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildUpdatePath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building update path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      put: {
        summary: `Update ${serverResource.type}`,
        description: documentation || `Update ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `update${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ],
        responses: await getResponses(
          config,
          'update',
          serverResource,
          profileSchemas,
          examples
        ),
        requestBody: await getRequestBody(
          config,
          'update',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'u'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildDeletePath = async (
  config,
  serverResource,
  profileSchemas,
  examples,
  documentation
) => {
  logger.debug(`Building delete path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      delete: {
        summary: `Delete ${serverResource.type}`,
        description: documentation || `Delete ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `delete${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ],
        responses: await getResponses(
          config,
          'delete',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: getSMARTScopes(
                serverResource.type,
                config.smartFeatures,
                'd'
              ).map((scope) => ({ smartOnFhir: [scope] })),
            }
          : {}),
        ...(config.securitySchemes?.OAuth
          ? {
              security: [{ OAuth: [config.defaultOAuthScope] }],
            }
          : {}),
      },
    },
  };
};

const buildPaths = async (config, capabilityStatement) => {
  const serverRest = capabilityStatement?.rest?.find(
    (r) => r.mode === 'server'
  );
  if (!serverRest) {
    logger.debug('No server mode found in the CapabilityStatement.');
    return {};
  }

  const paths = await systemLevelPaths(
    config,
    serverRest.interaction,
    serverRest.operation
  );
  const allSchemas = [];
  const allExamples = {};
  const tags = new Set();
  for (const resource of serverRest?.resource ?? []) {
    const { resourcePaths, schemas, examples } =
      await capabilityStatementRestResourceToPath(
        config,
        resource,
        capabilityStatement
      );
    allSchemas.push(...schemas);
    examples && Object.assign(allExamples, examples);
    for (const [path, operations] of Object.entries(resourcePaths)) {
      if (!paths[path]) {
        paths[path] = {};
      }
      Object.entries(operations).forEach(([method, operationDetails]) => {
        paths[path][method] = operationDetails;
        if (operationDetails.tags) {
          operationDetails.tags.forEach((tag) => tags.add(tag));
        }
      });
    }
  }
  return {
    paths,
    schemas: allSchemas,
    examples: allExamples,
    tags: Array.from(tags),
  };
};

const systemLevelPaths = async (config, interactions, operations) => {
  if (
    (!interactions || interactions.length === 0) &&
    operations &&
    operations.length === 0
  ) {
    return {};
  }
  const rootPaths = {};
  if (interactions && interactions.length > 0) {
    const responseContent = Object.fromEntries(
      config.contentType.map((type) => [
        type,
        {
          schema: getBundleResponseSchema(interactions),
        },
      ])
    );

    const requestContent = Object.fromEntries(
      config.contentType.map((type) => [
        type,
        {
          schema: getBundleRequestSchema(interactions),
        },
      ])
    );

    rootPaths['/'] = {
      post: {
        summary: 'System level interactions',
        description: 'System level interactions',
        tags: ['system'],
        operationId: 'systemInteractions',
        parameters: setGlobalHeaders(config),
        responses: {
          200: {
            description: 'Successful system level interaction',
            content: responseContent,
          },
        },
        requestBody: {
          content: requestContent,
        },
      },
    };
  }
  for (const operation of operations ?? []) {
    const { oas } = getCustomOperation(config, operation, 'system');
    Object.keys(oas).forEach((method) => {
      oas[method].operationId = `custom-${operation.name}-system`;
    });
    rootPaths[`/$${operation.name}`] = oas;
  }
  return rootPaths;
};

const buildMetadataPath = async (config, capabilityStatement) => {
  logger.debug('Building metadata path for CapabilityStatement');

  const content = Object.fromEntries(
    config.contentType.map((type) => [
      type,
      {
        schema: {
          $ref: `${OAS_SCHEMA_BASE_URL}CapabilityStatement-definition.json`,
        },
        examples: {
          CapabilityStatement: {
            value: capabilityStatement,
          },
        },
      },
    ])
  );
  return {
    get: {
      summary: 'Get CapabilityStatement',
      description: 'Returns the FHIR CapabilityStatement for this server',
      tags: ['metadata'],
      operationId: 'getCapabilityStatement',
      parameters: [...setGlobalHeaders(config)],
      responses: {
        200: {
          description: 'Successful retrieval of the CapabilityStatement',
          content,
        },
      },
    },
  };
};

const capabilityStatementRestResourceToPath = async (
  config,
  resource,
  capabilityStatement
) => {
  const { type, interaction, operation } = resource;
  logger.debug(
    `Building paths for ${type}. ${interaction?.length || 0} interactions found. ${operation?.length || 0} custom operations found.`
  );
  logger.debug(`Supported profiles: ${resource.supportedProfile}`);
  logger.debug(`Base profile: ${resource.profile || 'not supplied'}`);
  const profileSchemas = await generateOasSchemasFromProfiles(
    config,
    type,
    resource.profile,
    resource.supportedProfile
  );

  const examples = await getExamples(config, profileSchemas);
  const paths = {};
  await Promise.all(
    interaction.map(async ({ code, documentation }) => {
      let pathDetails;
      switch (code) {
        case 'read':
          pathDetails = await buildReadPath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'vread':
          pathDetails = await buildVersionedReadPath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'search-type':
          pathDetails = await buildSearchPath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'create':
          pathDetails = await buildCreatePath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'update':
          pathDetails = await buildUpdatePath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'patch':
          pathDetails = await buildPatchPath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        case 'delete':
          pathDetails = await buildDeletePath(
            config,
            resource,
            profileSchemas,
            examples,
            documentation
          );
          break;
        default:
          logger.debug(`Unsupported interaction found for ${type}: ${code}`);
          return;
      }

      // Extract path and operations from the result and use in addOrUpdatePath
      const pathKey = Object.keys(pathDetails)[0];
      addOrUpdatePath(paths, pathKey, pathDetails[pathKey]);
    })
  );
  const customOperations = {};
  for (const operation of resource?.operation ?? []) {
    const { definition, oas } = getCustomOperation(config, operation, type);
    if (definition.instance) {
      const operations = { ...oas };
      Object.keys(operations).forEach((method) => {
        operations[method]?.parameters.push(
          getPathParameter('rid', 'Resource id')
        );
        operations[method].operationId =
          `custom-${operation.name}-${resource.type}-instance`;
      });
      customOperations[`/${type}/{rid}/$${operation.name}`] = operations;
    }
    if (definition.type) {
      const operations = { ...oas };
      Object.keys(operations).forEach((method) => {
        operations[method].operationId =
          `custom-${operation.name}-${resource.type}-type`;
      });
      customOperations[`/${type}/$${operation.name}`] = operations;
    }
  }

  addOrUpdatePath(
    paths,
    '/metadata',
    await buildMetadataPath(config, capabilityStatement)
  );

  if (Object.keys(customOperations).length > 0) {
    Object.entries(customOperations).forEach(([pathKey, operations]) => {
      addOrUpdatePath(paths, pathKey, operations);
    });
  }
  return { resourcePaths: paths, schemas: profileSchemas, examples };
};

module.exports = { buildPaths };

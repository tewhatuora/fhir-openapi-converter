const debug = require('debug')('fhir-oasgen:paths');
const {
  renderParameter,
  getPathParameter,
  setGlobalHeaders,
} = require('./parameters');
const { getResponses } = require('./responses');
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
  examples
) => {
  debug(`Building read path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      get: {
        summary: `Read ${serverResource.type}`,
        description: `Read ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `read${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
        responses: await getResponses(
          config,
          'read',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'r'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building vread path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}/_history/{vid}`]: {
      get: {
        summary: `Read ${serverResource.type} (versioned)`,
        description: `Read ${serverResource.type} (versioned)`,
        tags: [serverResource.type],
        operationId: `vread${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
          getPathParameter('vid', 'Resource version id'),
        ].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
        responses: await getResponses(
          config,
          'vread',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'r'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building create path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}`]: {
      post: {
        summary: `Create ${serverResource.type}`,
        description: `Create ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `create${serverResource.type}`,
        parameters: [...setGlobalHeaders(config)].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
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
          profileSchemas
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'c'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building patch path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      patch: {
        summary: `Patch for ${serverResource.type}`,
        description: `Patch for ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `patch${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
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
          profileSchemas
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'u'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building search path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}`]: {
      get: {
        summary: `Search for ${serverResource.type}`,
        description: `Search for ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `search${serverResource.type}`,
        parameters: [...setGlobalHeaders(config)].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
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
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    's'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building update path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      put: {
        summary: `Update ${serverResource.type}`,
        description: `Update ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `update${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
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
          profileSchemas
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'u'
                  ),
                },
              ],
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
  examples
) => {
  debug(`Building delete path for ${serverResource.type}`);
  return {
    [`/${serverResource.type}/{rid}`]: {
      delete: {
        summary: `Delete ${serverResource.type}`,
        description: `Delete ${serverResource.type}`,
        tags: [serverResource.type],
        operationId: `delete${serverResource.type}`,
        parameters: [
          ...setGlobalHeaders(config),
          getPathParameter('rid', 'Resource id'),
        ].concat(
          (serverResource.searchParam || []).map((param) =>
            renderParameter(param)
          )
        ),
        responses: await getResponses(
          config,
          'delete',
          serverResource,
          profileSchemas,
          examples
        ),
        ...(config.securitySchemes?.smartOnFhir
          ? {
              security: [
                {
                  smartOnFhir: getSMARTScopes(
                    serverResource.type,
                    config.smartFeatures,
                    'd'
                  ),
                },
              ],
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
    debug('No server mode found in the CapabilityStatement.');
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
      await capabilityStatementRestResourceToPath(config, resource);
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
            content: {
              [config.contentType]: {
                schema: getBundleResponseSchema(interactions),
              },
            },
          },
        },
        requestBody: {
          content: {
            [config.contentType]: {
              schema: getBundleRequestSchema(interactions),
            },
          },
        },
      },
    };
  }
  for (const operation of operations ?? []) {
    rootPaths[`/$${operation.name}`] = getCustomOperation(
      config,
      operation,
      'system'
    );
  }
  return rootPaths;
};

const capabilityStatementRestResourceToPath = async (config, resource) => {
  const { type, interaction, operation } = resource;
  debug(
    `Building paths for ${type}. ${interaction?.length} interactions found. ${operation?.length} custom operations found.`
  );
  debug(`Supported profiles: ${resource.supportedProfile}`);
  debug(`Base profile: ${resource.profile}`);
  const profileSchemas = await generateOasSchemasFromProfiles(
    config,
    type,
    resource.profile,
    resource.supportedProfile
  );
  const examples = await getExamples(config, profileSchemas);
  const paths = {};
  await Promise.all(
    interaction.map(async ({ code }) => {
      let pathDetails;
      switch (code) {
        case 'read':
          pathDetails = await buildReadPath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'vread':
          pathDetails = await buildVersionedReadPath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'search-type':
          pathDetails = await buildSearchPath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'create':
          pathDetails = await buildCreatePath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'update':
          pathDetails = await buildUpdatePath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'patch':
          pathDetails = await buildPatchPath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        case 'delete':
          pathDetails = await buildDeletePath(
            config,
            resource,
            profileSchemas,
            examples
          );
          break;
        default:
          debug(`Unsupported interaction found for ${type}: ${code}`);
          return;
      }

      // Extract path and operations from the result and use in addOrUpdatePath
      const pathKey = Object.keys(pathDetails)[0];
      addOrUpdatePath(paths, pathKey, pathDetails[pathKey]);
    })
  );
  const customOperations = {};
  for (const operation of resource?.operation ?? []) {
    customOperations[`/${type}/$${operation.name}`] = getCustomOperation(
      config,
      operation,
      type
    );
  }
  if (Object.keys(customOperations).length > 0) {
    Object.entries(customOperations).forEach(([pathKey, operations]) => {
      addOrUpdatePath(paths, pathKey, operations);
    });
  }
  return { resourcePaths: paths, schemas: profileSchemas, examples };
};

module.exports = { buildPaths };

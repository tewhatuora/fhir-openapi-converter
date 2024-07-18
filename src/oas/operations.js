const { setGlobalHeaders } = require('./parameters');
const { OAS_SCHEMA_BASE_URL } = require('../constants');
const { getParametersResourceSchema } = require('./fhir');
const { generateDefaultResponses } = require('./responses');

const getOperationResponse = (outParam, operationName, config) => {
  const successResponse = {
    200: {
      description: outParam?.description || 'Successful response',
      content: {
        [config.contentType]: {
          schema: {
            $ref: `${OAS_SCHEMA_BASE_URL}${outParam?.type}-definition.json`,
          },
        },
      },
    },
  };

  const defaultResponses = generateDefaultResponses(operationName, config);

  // Combine successResponse with generatedResponse
  const combinedResponse = {
    ...successResponse,
    ...defaultResponses,
  };

  return combinedResponse;
};

const getRequestBody = (config) => ({
  content: {
    [config.contentType]: {
      schema: getParametersResourceSchema(),
    },
  },
});

const getParameters = (parameters) =>
  parameters
    .filter((param) => param.use === 'in')
    .map((param) => ({
      name: param.name,
      ...(param.description ? { description: param.description } : {}),
      in: 'query',
      required: param.min > 0,
      schema: { type: 'string' },
    }));

const getOperationConfig = (
  operationDefinition,
  resourceType,
  outParam,
  config
) => {
  const baseOperation = {
    summary:
      operationDefinition.name ||
      `Custom operation ${operationDefinition.code}`,
    description:
      operationDefinition.description ||
      `Custom operation ${operationDefinition.code} ${resourceType}`,
    tags: [resourceType],
    responses: getOperationResponse(outParam, operationDefinition.name, config),
    parameters: setGlobalHeaders(config),
    ...(config.securitySchemes?.smartOnFhir
      ? {
          security: [{ smartOnFhir: [operationDefinition.url] }],
        }
      : {}),
    ...(config.securitySchemes?.OAuth
      ? {
          security: [{ OAuth: [config.defaultOAuthScope] }],
        }
      : {}),
  };

  return operationDefinition.kind === 'operation'
    ? {
        post: {
          ...baseOperation,
          requestBody: getRequestBody(config),
        },
      }
    : {
        get: {
          ...baseOperation,
          parameters: [...setGlobalHeaders(config)].concat(
            getParameters(operationDefinition.parameter)
          ),
        },
      };
};

const getCustomOperation = (config, operation, resourceType) => {
  const operationDefinition = config.igFiles[operation.definition];
  if (!operationDefinition) {
    throw new Error(
      `Operation definition ${operation.definition} not found in the implementation guide`
    );
  }
  const outParam = operationDefinition?.parameter.find(
    (param) => param.use === 'out'
  );

  return {
    definition: operationDefinition,
    oas: getOperationConfig(operationDefinition, resourceType, outParam, config)
  };
};

module.exports = {
  getCustomOperation,
};

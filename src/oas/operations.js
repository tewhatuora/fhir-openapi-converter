const { setGlobalHeaders } = require('./parameters');
const { OAS_SCHEMA_BASE_URL } = require('../constants');
const { getParametersResourceSchema } = require('./fhir');
const { generateDefaultResponses } = require('./responses');

const getOperationResponse = (outParams, operationName, config) => {
  // Preserve the converter's direct-resource response for a sole "return" output.
  const directReturn = outParams.length === 1 && outParams[0].name === 'return';
  const responseSchema = directReturn
    ? {
        $ref: `${OAS_SCHEMA_BASE_URL}${outParams[0].type}-definition.json`,
      }
    : getParametersResourceSchema();

  const content = outParams.length
    ? Object.fromEntries(
        config.contentType.map((type) => [
          type,
          {
            schema: responseSchema,
          },
        ])
      )
    : undefined;

  const successResponse = {
    200: {
      description: outParams[0]?.description || 'Successful response',
      ...(content ? { content } : {}),
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
  content: Object.fromEntries(
    config.contentType.map((type) => [
      type,
      {
        schema: getParametersResourceSchema(),
      },
    ])
  ),
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
  outParams,
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
    responses: getOperationResponse(
      outParams,
      operationDefinition.name,
      config
    ),
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
  const outParams =
    operationDefinition?.parameter?.filter((param) => param.use === 'out') ||
    [];

  return {
    definition: operationDefinition,
    oas: getOperationConfig(
      operationDefinition,
      resourceType,
      outParams,
      config
    ),
  };
};

module.exports = {
  getCustomOperation,
};

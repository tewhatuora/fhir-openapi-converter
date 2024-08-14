const { getBundleResponseSchema } = require('./bundle');
const { wrapExamplesAsSearchSet } = require('./examples');

const OAS_SCHEMA_BASE_URL =
  'https://raw.githubusercontent.com/tewhatuora/schemas/main/alt-fhir-oas-flattened/';

// Function to generate default responses based on status codes and interaction type
const generateDefaultResponses = (interactionType, config) => {
  // Generate default responses
  const defaultResponsesString =
    config.defaultResponses || config['default-responses'];
  const defaultResponsesCodes = defaultResponsesString
    .split(',')
    .map((code) => parseInt(code, 10));

  const defaultResponses = {};

  defaultResponsesCodes.forEach((statusCode) => {
    const generatedResponse = {
      description: `Unsuccessful ${interactionType} operation - ${statusCode}`,
      content: {
        [config.contentType]: {
          schema: {
            $ref: `${OAS_SCHEMA_BASE_URL}OperationOutcome-definition.json`,
          },
        },
      },
    };

    defaultResponses[statusCode] = generatedResponse;
  });

  return defaultResponses;
};

// Function to get responses based on configuration, interaction type, server resource, profile schemas, examples, and status code
const getResponses = async (
  config,
  interactionType,
  serverResource,
  profileSchemas,
  examples,
  statusCode
) => {
  // Preprocess profileSchemas to transform each URL into an OpenAPI $ref pointing to the components section
  const profileRefs = (profileSchemas || []).map((schema) => {
    return {
      $ref: `#/components/schemas/${schema.fhir?.resourceType}-${schema.fhir?.id}`,
    };
  });

  const matchingExamples = {};
  profileSchemas.forEach((schema) => {
    if (config.igFiles?.examples?.[schema.description]) {
      config.igFiles.examples[schema.description].forEach((example, index) => {
        matchingExamples[`${schema.description}-${index + 1}`] = {
          value: config.igFiles.examples[schema.description][index],
        };
      });
    }
  });

  const defaultResponses = generateDefaultResponses(interactionType, config);
  let generatedResponse;

  if (interactionType === 'delete') {
    generatedResponse = {
      200: {
        description: `Successful ${interactionType} operation`,
        content: {
          [config.contentType]: {
            schema: {
              $ref: `${OAS_SCHEMA_BASE_URL}OperationOutcome-definition.json`,
            },
          },
        },
      },
    };
  } else if (interactionType === 'search') {
    generatedResponse = {
      200: {
        description: `Successful ${interactionType} operation`,
        content: {
          [config.contentType]: {
            schema: getBundleResponseSchema([], profileRefs, ['searchset']),
            ...(Object.keys(examples).length
              ? {
                  examples: wrapExamplesAsSearchSet(
                    config,
                    serverResource.type
                  ),
                }
              : {}),
          },
        },
      },
    };
  } else {
    const successStatusCode = interactionType === 'create' ? 201 : 200;
    generatedResponse = {
      [successStatusCode]: {
        description: `Successful ${interactionType} operation`,
        content: {
          [config.contentType]: {
            schema: {
              anyOf: [...profileRefs],
            },
            ...(Object.keys(examples).length ? { examples } : {}),
          },
        },
      },
    };
  }

  // Combine default responses with generated responses
  const combinedResponses = { ...defaultResponses, ...generatedResponse };

  return combinedResponses;
};

module.exports = { getResponses, generateDefaultResponses };

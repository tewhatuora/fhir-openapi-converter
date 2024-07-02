const OAS_SCHEMA_BASE_URL =
  'https://raw.githubusercontent.com/tewhatuora/schemas/main/alt-fhir-oas-flattened/';

const getRequestBody = async (
  config,
  method,
  serverResource,
  profileSchemas
) => {
  const schemaUrl = `${OAS_SCHEMA_BASE_URL}${serverResource.type}-definition.json`;
  const profileRefs = (profileSchemas || []).map((schema) => {
    return {
      $ref: `#/components/schemas/${schema.fhir?.resourceType}-${schema.fhir?.id}`,
    };
  });
  return {
    description: `${serverResource.type} to create`,
    required: true,
    content: {
      'application/json': {
        schema: {
          // anyOf: [{$ref: schemaUrl}, ...profileRefs]
          anyOf: [...profileRefs],
        },
      },
    },
  };
};

module.exports = { getRequestBody };

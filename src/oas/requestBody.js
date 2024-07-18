const getRequestBody = async (
  config,
  method,
  serverResource,
  profileSchemas
) => {
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
          anyOf: [...profileRefs],
        },
      },
    },
  };
};

module.exports = { getRequestBody };

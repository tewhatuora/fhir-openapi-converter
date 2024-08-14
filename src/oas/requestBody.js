const getRequestBody = async (
  config,
  method,
  serverResource,
  profileSchemas,
  examples = {}
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
      [config.contentType]: {
        schema: {
          anyOf: [...profileRefs],
        },
        ...(Object.keys(examples).length
          ? {
              examples: Object.fromEntries(
                Object.entries(examples).map(([key, value]) => [
                  method === 'create' ? `${key}-create` : key,
                  {
                    ...value,
                    $ref:
                      method === 'create'
                        ? `${value['$ref']}-create`
                        : value['$ref'],
                  },
                ])
              ),
            }
          : {}),
      },
    },
  };
};

module.exports = { getRequestBody };

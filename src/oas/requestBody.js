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
  const exampleEntries = Object.keys(examples).length
    ? Object.fromEntries(
        Object.entries(examples).map(([key, value]) => [
          method === 'create' ? `${key}-create` : key,
          {
            ...value,
            $ref:
              method === 'create' ? `${value['$ref']}-create` : value['$ref'],
          },
        ])
      )
    : undefined;

  const content = Object.fromEntries(
    config.contentType.map((type) => [
      type,
      {
        schema: {
          anyOf: [...profileRefs],
        },
        ...(exampleEntries && { examples: exampleEntries }),
      },
    ])
  );
  return {
    description: `${serverResource.type} to create`,
    required: true,
    content,
  };
};

module.exports = { getRequestBody };

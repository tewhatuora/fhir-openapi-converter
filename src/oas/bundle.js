const getBundleRequestSchema = (interactions) => {
  return {
    type: 'object',
    properties: {
      resourceType: {
        type: 'string',
        enum: ['Bundle'],
        description: 'Resource type must be a Bundle.',
      },
      type: {
        type: 'string',
        enum: interactions.map((i) => i.code),
        description: 'The type of bundle (e.g., transaction or batch).',
      },
      entry: {
        type: 'array',
        description:
          'Entries in the bundle representing resources involved in the interaction.',
        items: {
          type: 'object',
          properties: {
            resource: {
              type: 'object',
              description: 'A resource in the bundle.',
            },
            request: {
              type: 'object',
              description: 'A resource in the bundle.',
              properties: {
                method: {
                  type: 'string',
                  enum: ['GET', 'POST', 'PUT', 'DELETE'],
                  description: 'The HTTP method used for the request.',
                },
                url: {
                  type: 'string',
                  description: 'The URL for the request.',
                },
              },
            },
          },
        },
      },
    },
  };
};

const getBundleResponseSchema = (interactions, profileRefs, forceType) => {
  return {
    type: 'object',
    properties: {
      resourceType: {
        type: 'string',
        enum: ['Bundle'],
        description: 'Resource type must be a Bundle.',
      },
      type: {
        type: 'string',
        enum: forceType || interactions.map((i) => `${i.code}-response`),
        description:
          'The type of response (e.g., transaction-response or batch-response).',
      },
      entry: {
        type: 'array',
        description:
          'Entries in the bundle representing resources involved in the interaction.',
        items: {
          type: 'object',
          properties: {
            resource: {
              type: 'object',
              description: 'A resource in the bundle.',
              ...(profileRefs?.length ? { anyOf: profileRefs } : {}),
            },
            fullUrl: {
              type: 'string',
              description: 'The full url of the resource',
            },
          },
        },
      },
    },
  };
};

module.exports = {
  getBundleRequestSchema,
  getBundleResponseSchema,
};

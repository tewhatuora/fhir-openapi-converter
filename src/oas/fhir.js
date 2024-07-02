const getParametersResourceSchema = () => {
  return {
    type: 'object',
    properties: {
      resourceType: {
        type: 'string',
        enum: ['Parameters'],
      },
      parameter: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            valueString: {
              type: 'string',
            },
          },
          additionalProperties: true,
          required: ['name'],
        },
      },
    },
    required: ['resourceType', 'parameter'],
  };
};

module.exports = {
  getParametersResourceSchema,
};

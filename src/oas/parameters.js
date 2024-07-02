const debug = require('debug')('fhir-oasgen:parameters');

const renderParameter = (searchParam, options = {}) => {
  options.in = options.in || 'query';

  switch (searchParam.type) {
    case 'number':
      return {
        name: searchParam.name,
        in: options.in,
        schema: { type: 'integer' },
        example: 123456,
      };
    case 'date':
      return {
        name: searchParam.name,
        in: options.in,
        schema: { type: 'string' },
        examples: {
          date: {
            value: '2024-12-02',
          },
        },
      };
    case 'token':
    case 'reference':
    case 'composite':
    case 'quantity':
    case 'uri':
    case 'string':
    case 'special':
      // Cases that all share the same schema type 'string'
      return {
        name: searchParam.name,
        in: options.in,
        schema: { type: 'string' },
      };
    default:
      // Handling unsupported parameter types
      debug(
        `Unsupported parameter found ${searchParam.name}: ${searchParam.type}`
      );
      return {
        name: searchParam.name,
        in: options.in,
        schema: { type: 'string' },
      };
  }
};

const getPathParameter = (name, description) => {
  return {
    description,
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  };
};

const setGlobalHeaders = (config) => {
  if (!config.globalHeaders || config.globalHeaders.length === 0) {
    return [];
  }

  return config.globalHeaders
    .map((header) => {
      // This ensures that there is actually a key-value pair in the header object.
      if (Object.keys(header).length === 0) {
        return null;
      }

      const [name, details] = Object.entries(header)[0];
      if (!name || !details) {
        debug.error('Invalid header configuration:', header);
        return null;
      }

      return {
        name: name,
        in: 'header',
        required: details.required,
        schema: {
          type: 'string',
          $ref: details.value,
        },
      };
    })
    .filter((item) => item !== null);
};

module.exports = {
  getPathParameter,
  renderParameter,
  setGlobalHeaders,
};

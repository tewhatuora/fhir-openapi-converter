const logger = require('../logger');
const { MANDATORY_SEARCH_PARAM_EXTENSION_URL } = require('../constants');
const e = require('express');

const renderParameter = (searchParam, resourceExtension = []) => {
  const mandatorySearchParam = resourceExtension.find(
    (ext) =>
      ext.url === MANDATORY_SEARCH_PARAM_EXTENSION_URL &&
      ext?.extension.find(
        (e) => e.url === 'required' && e.valueString === searchParam.name
      )
  );

  if (mandatorySearchParam) {
    logger.debug(
      `Found mandatory search parameter ${searchParam.name}`
    );
  }

  switch (searchParam.type) {
    case 'number':
      return {
        name: searchParam.name,
        in: 'query',
        required: mandatorySearchParam ? true : false,
        schema: { type: 'integer' },
        example: 123456,
      };
    case 'date':
      return {
        name: searchParam.name,
        in: 'query',
        style: 'form',
        explode: true,
        required: mandatorySearchParam ? true : false,
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
        required: mandatorySearchParam ? true : false,
        in: 'query',
        schema: { type: 'string' },
      };
    default:
      // Handling unsupported parameter types
      logger.debug(
        `Unsupported parameter found ${searchParam.name}: ${searchParam.type}`
      );
      return {
        name: searchParam.name,
        in: 'query',
        schema: { type: 'string' },
        required: mandatorySearchParam ? true : false,
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
        ...(details.documentation
          ? { description: details.documentation }
          : {}),
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

const _ = require('lodash');
const logger = require('../logger');
const { CAPABILITY_STATEMENT_EXTENSIONS_URL } = require('../constants');

const extractCustomExtensions = (capabilityStatement) => {
  const extensions = capabilityStatement?.extension || [];
  const customDetails =
    extensions.find(
      (extension) => extension.url === CAPABILITY_STATEMENT_EXTENSIONS_URL
    ) || [];

  let globalHeaders = [];
  if (customDetails && customDetails.extension) {
    globalHeaders = customDetails.extension.reduce((acc, header) => {
      if (header.url === 'globalHeaders' && header.extension) {
        header.extension.forEach((item) => {
          const keyExtension = _.find(item.extension, { url: 'key' });
          const valueExtension = _.find(item.extension, { url: 'value' });
          const requiredExtension = _.find(item.extension, { url: 'required' });

          if (keyExtension?.valueString && valueExtension?.valueUri) {
            acc.push({
              [keyExtension.valueString]: {
                value: valueExtension.valueUri,
                required: requiredExtension?.valueBoolean || false,
              },
            });
          } else {
            logger.debug('Invalid header configuration:', item);
          }
        });
      }
      return acc;
    }, []);
  }

  const licenseURL = _.find(customDetails?.extension, {
    url: 'licenseURL',
  })?.valueUri;
  const licenseName = _.find(customDetails?.extension, {
    url: 'licenseName',
  })?.valueString;
  const externalDocs = _.find(customDetails?.extension, {
    url: 'externalDocs',
  })?.valueUri;

  logger.debug(
    'Custom globalHeaders found:',
    globalHeaders ? {globalHeaders} : 'none'
  );
  logger.debug('licenseName:', {licenseName});
  logger.debug('externalDocs:', {externalDocs});

  return {
    licenseURL,
    licenseName,
    externalDocs,
    ...(globalHeaders.length > 0 ? { globalHeaders } : {}),
  };
};

module.exports = {
  extractCustomExtensions,
};

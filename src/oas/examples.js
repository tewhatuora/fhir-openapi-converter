const getExamples = async (config, profileSchemas) => {
  const matchingExamples = {};
  profileSchemas.forEach((schema) => {
    if (config.igFiles?.examples?.[schema.oas.description]) {
      config.igFiles.examples[schema.oas.description].forEach((example) => {
        matchingExamples[`${example.resourceType}-${example.id}`] = {
          $ref: `#/components/examples/${example.resourceType}-${example.id}`,
        };
      });
    }
  });
  return matchingExamples;
};

const wrapExamplesAsSearchSet = (config, resourceType) => {
  const validExamples = [];
  Object.keys(config.igFiles?.examples).forEach((key) => {
    if (config.igFiles?.examples[key].length) {
      config.igFiles?.examples[key].forEach((example) => {
        if (example.resourceType === resourceType) {
          validExamples.push(example);
        }
      });
    }
  });

  const resourceExamples = {};
  if (validExamples.length) {
    resourceExamples['searchset-example'] = {
      value: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: validExamples.map((example) => {
          return {
            fullUrl: `${config.serverUrl}/${example.resourceType}/${example.id}`,
            resource: example,
            search: {
              mode: 'match',
            },
          };
        }),
      },
    };
  }

  return resourceExamples || {};
};

module.exports = {
  getExamples,
  wrapExamplesAsSearchSet,
};

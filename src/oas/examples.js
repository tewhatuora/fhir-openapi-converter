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

module.exports = {
  getExamples,
};

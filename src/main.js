const OpenAPIParser = require('@readme/openapi-parser');
const { generateOpenApiSpec } = require('./openApiGenerator');
const { getFHIRArtifacts, writeOasFiles } = require('./utils');
const { CAPABILITY_STATEMENT_URL } = require('./constants');
const logger = require('./logger');
const { name, version } = require('../package.json');

const main = async (config) => {
  try {
    logger.info('Using version:', { name, version });
    // Retrieve FHIR artifacts from the given sources (local or remote)
    const { capabilityStatements, packageDirectory, igFiles } =
      await getFHIRArtifacts(config);
    if (capabilityStatements.length === 0) {
      throw new Error(
        `No CapabilityStatements found matching ${CAPABILITY_STATEMENT_URL}`
      );
    }

    // Generate an OpenAPI specification for each CapabilityStatement and write to files
    const generatedOas = [];
    for (const capabilityStatement of capabilityStatements) {
      const oas = await generateOpenApiSpec(
        { ...config, packageDirectory, igFiles },
        capabilityStatement
      );
      await writeOasFiles(config, oas, capabilityStatement);
      // Validate the output is a valid OpenAPI specification
      await OpenAPIParser.validate(oas);
      generatedOas.push(oas);
    }
    return generatedOas;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  main,
};

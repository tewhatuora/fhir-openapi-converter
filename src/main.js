const debug = require('debug')('fhir-oasgen:main');
const OpenAPIParser = require('@readme/openapi-parser');
const { generateOpenApiSpec } = require('./openApiGenerator');
const { getFHIRArtifacts, writeOasFiles } = require('./utils');
const { CAPABILITY_STATEMENT_URL } = require('./constants');

const main = async (config) => {
  try {
    // Retrieve FHIR artifacts from the given sources (local or remote)
    const { capabilityStatements, packageDirectory, igFiles } =
      await getFHIRArtifacts(config);
    if (capabilityStatements.length === 0) {
      throw new Error(
        `No CapabilityStatements found matching ${CAPABILITY_STATEMENT_URL}`
      );
    }

    // Generate an OpenAPI specification for each CapabilityStatement and write to files
    for (const capabilityStatement of capabilityStatements) {
      const oas = await generateOpenApiSpec(
        { ...config, packageDirectory, igFiles },
        capabilityStatement
      );
      writeOasFiles(config, oas, capabilityStatement);
      // Validate the output is a valid OpenAPI specification
      await OpenAPIParser.validate(oas);
      return oas;
    }
  } catch (error) {
    throw error;
  }
};

module.exports = {
  main,
};
import OpenAPIParser from '@readme/openapi-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { generateOpenApiSpec } from './openApiGenerator';
import { getFHIRArtifacts } from './ig/loadPackage';
import { writeSpecFiles } from './output/writeSpecFiles';
import { CAPABILITY_STATEMENT_URL } from './constants';
import logger from './logger';
import { name, version } from '../package.json';
import type { CliOptions } from './types';

/**
 * Generates, writes and validates one OpenAPI spec per matching
 * CapabilityStatement in the IG, returning the generated specs.
 */
export const main = async (
  options: CliOptions
): Promise<OpenAPIV3.Document[]> => {
  logger.info('Using version:', { name, version });
  const { capabilityStatements, ig } = await getFHIRArtifacts(options);
  if (capabilityStatements.length === 0) {
    throw new Error(
      `No CapabilityStatements found matching ${CAPABILITY_STATEMENT_URL}`
    );
  }

  const generated: OpenAPIV3.Document[] = [];
  for (const capabilityStatement of capabilityStatements) {
    const oas = await generateOpenApiSpec(capabilityStatement, ig, options);
    await writeSpecFiles(options, oas, capabilityStatement);
    // Validate the output is a valid OpenAPI specification
    await OpenAPIParser.validate(oas);
    generated.push(oas);
  }
  return generated;
};

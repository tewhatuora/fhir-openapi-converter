import fs from 'fs';
import YAML from 'yaml';
import OpenAPIParser from '@readme/openapi-parser';
import type { OpenAPIV3 } from 'openapi-types';
import logger from '../logger';
import type { CapabilityStatement, CliOptions } from '../types';

/** Writes the spec as `<id>.openapi.json` and `<id>.openapi.yaml`. */
export async function writeSpecFiles(
  options: Pick<
    CliOptions,
    'disableOutputFiles' | 'outputFolder' | 'dereferenceOutput'
  >,
  oas: OpenAPIV3.Document,
  capabilityStatement: CapabilityStatement
): Promise<void> {
  if (options.disableOutputFiles) {
    logger.warn('Output files are disabled');
    return;
  }
  if (!fs.existsSync(options.outputFolder)) {
    fs.mkdirSync(options.outputFolder, { recursive: true });
  }

  const basePath = `${options.outputFolder}/${capabilityStatement.id}.openapi`;
  let spec = oas;
  if (options.dereferenceOutput) {
    logger.debug('Deferencing output');
    spec = (await OpenAPIParser.dereference(oas)) as OpenAPIV3.Document;
  }

  fs.writeFileSync(`${basePath}.json`, JSON.stringify(spec, null, 2));
  logger.info(`Created OpenAPI JSON file: ${basePath}.json`);
  fs.writeFileSync(`${basePath}.yaml`, YAML.stringify(spec));
  logger.info(`Created OpenAPI YAML file: ${basePath}.yaml`);
}

const fs = require('fs');
const logger = require('./logger');
const OpenAPIParser = require('@readme/openapi-parser');
const { get } = require('lodash');
const zlib = require('zlib');
const { pipeline } = require('stream');
const util = require('util');
const streamPipeline = util.promisify(pipeline);
const tmp = require('tmp');
const tar = require('tar');
const { walk } = require('@nodelib/fs.walk');
const YAML = require('yaml');
const { CAPABILITY_STATEMENT_URL } = require('./constants');

// Set up graceful cleanup of temporary files
tmp.setGracefulCleanup();

/**
 * Downloads and extracts multiple FHIR IG packages from specified URLs.
 * @param {string[]} urls - The URLs to download the IG packages from.
 * @param {boolean} persistFiles - If true, downloaded files are not automatically cleaned up.
 * @returns {Promise<string>} - The path to the extracted directory containing all IG packages.
 */
async function downloadPackages(urls, persistFiles) {
  const tempDir = tmp.dirSync({ unsafeCleanup: !persistFiles });
  const extractPath = `${tempDir.name}/extracted`;
  fs.mkdirSync(extractPath, { recursive: true });
  logger.debug(`Created temporary directory for extraction: ${extractPath}`);
  await Promise.all(
    urls.map(async (url, index) => {
      logger.debug(`Downloading package from: ${url}`);
      const response = await fetch(url);
      // Append a unique identifier to each filename
      const packagePath = `${tempDir.name}/package-${index}.tgz`;

      logger.debug(`Writing to temporary file: ${packagePath}`);
      await streamPipeline(response.body, fs.createWriteStream(packagePath));
      await streamPipeline(
        fs.createReadStream(packagePath),
        zlib.createGunzip(),
        tar.extract({ cwd: extractPath })
      );
    })
  );

  return extractPath;
}

/**
 * Safely parses a JSON string into an object.
 * @param {string} str - The JSON string to parse.
 * @returns {Object} - The parsed object or an empty object on error.
 */
function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

const addOrUpdatePath = (paths, pathKey, operations) => {
  if (!paths[pathKey]) {
    paths[pathKey] = {};
  }

  // Merge the operations into the existing or new pathKey
  Object.entries(operations).forEach(([method, operationDetails]) => {
    paths[pathKey][method] = operationDetails;
  });
};

/**
 * Walks through a directory and processes JSON files based on a filtering function.
 * @param {string} directory - The directory to walk through.
 * @param {Function} filterFunc - A function to filter and process JSON content.
 * @returns {Promise<Array>} - An array of processed JSON objects that match the filter.
 */
async function walkAndProcess(directory) {
  logger.debug('Reading directory json files:', {directory});
  const entries = {
    CapabilityStatements: [],
    examples: {},
  };
  const asyncWalk = util.promisify(walk);
  const result = await asyncWalk(directory, {
    entryFilter: (entry) => entry.name.endsWith('.json'),
    stats: true,
  });

  result.forEach((entry) => {
    const content = safeJSONParse(fs.readFileSync(entry.path, 'utf8'));
    if (
      ['StructureDefinition', 'OperationDefinition'].includes(
        content.resourceType
      )
    ) {
      entries[content.url] = content;
    }
    if (content.resourceType === 'CapabilityStatement') {
      entries['CapabilityStatements'].push(content);
    }
    if (content?.meta?.profile?.length > 0) {
      if (entries.examples[content.meta.profile[0]]) {
        entries.examples[content.meta.profile[0]].push(content);
      } else {
        entries.examples[content.meta.profile[0]] = [content];
      }
    }
  });
  return entries;
}

/**
 * Retrieves FHIR artifacts from a directory or a remote URL.
 * @param {Object} config - Configuration options including inputFolder, remoteUrl, and persistFiles.
 * @returns {Promise<Object>} - An object containing arrays of CapabilityStatements, a single ImplementationGuide, and the directory path.
 */
async function getFHIRArtifacts(config) {
  const directory =
    config.inputFolder ||
    (await downloadPackages(
      [config.remoteUrl, ...(config.remoteDependencyUrl || [])],
      config.persistFiles
    ));
  const igFiles = await walkAndProcess(directory);
  const capabilityStatements = igFiles.CapabilityStatements;
  const filteredCapabilityStatements = capabilityStatements.filter(
    (capabilityStatement) => {
      const matchesTargetCapabilityProfile =
        capabilityStatement?.meta?.profile.includes(CAPABILITY_STATEMENT_URL);
      if (matchesTargetCapabilityProfile) {
        return true;
      } else {
        logger.warn(
          `Ignoring CapabilityStatement with URL: ${capabilityStatement.id}, must be InstanceOf ${CAPABILITY_STATEMENT_URL}`
        );
        return false;
      }
    }
  );

  return {
    capabilityStatements: filteredCapabilityStatements || [],
    packageDirectory: directory,
    igFiles,
  };
}

/**
 * Retrieves matching FHIR artifacts from a directory based on specified key and value.
 * @param {Object} config - Configuration options including packageDirectory.
 * @param {string} matcherKey - The key path to match the value against.
 * @param {string|array} matcherValue - The value or array of values to match against.
 * @returns {Promise<Array>} - An array of matching FHIR artifacts.
 */
async function getMatchingArtifacts(config, matcherKey, matcherValue) {
  const entries = await walkAndProcess(config.packageDirectory, (content) => {
    const values = get(content, matcherKey);
    return Array.isArray(values)
      ? values.includes(matcherValue)
      : values === matcherValue;
  });
  return entries;
}

/**
 * Writes the OpenAPI specifications to files.
 * @param {Object} config - Configuration options including outputFolder.
 * @param {Object} oas - The OpenAPI specification object.
 * @param {Object} capabilityStatement - A FHIR CapabilityStatement.
 */
async function writeOasFiles(config, oas, capabilityStatement) {
  if (config.disableOutputFiles) {
    logger.warn('Output files are disabled');
    return;
  }
  let spec = oas;
  if (!fs.existsSync(config.outputFolder)) {
    fs.mkdirSync(config.outputFolder, { recursive: true });
  }

  const jsonFilePath = `${config.outputFolder}/${capabilityStatement.id}.openapi.json`;
  const yamlFilePath = `${config.outputFolder}/${capabilityStatement.id}.openapi.yaml`;

  if (config.dereferenceOutput) {
    logger.debug('Deferencing output');
    spec = await OpenAPIParser.dereference(oas);
  }

  fs.writeFileSync(jsonFilePath, JSON.stringify(spec, null, 2));
  logger.info(`Created OpenAPI JSON file: ${jsonFilePath}`);
  fs.writeFileSync(yamlFilePath, YAML.stringify(spec));
  logger.info(`Created OpenAPI YAML file: ${yamlFilePath}`);
}

module.exports = {
  addOrUpdatePath,
  getFHIRArtifacts,
  getMatchingArtifacts,
  writeOasFiles,
};

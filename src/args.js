const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const getArgs = () => {
  return yargs(hideBin(process.argv))
    .option('inputFolder', {
      alias: 'i',
      type: 'string',
      description:
        'Local path to the FHIR Implementation Guide package folder. Example: --inputFolder ./path/to/local/package',
      demandOption: false,
    })
    .option('outputFolder', {
      default: './output',
      alias: 'o',
      type: 'string',
      description:
        'Local path to write OpenAPI specifications Example: --outputFolder ./output',
      demandOption: false,
    })
    .option('remoteUrl', {
      alias: 'u',
      type: 'string',
      description:
        'Remote URL to download the FHIR Implementation Guide package. Example: --remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz',
      demandOption: false,
    })
    .option('remoteDependencyUrl', {
      alias: 'd',
      type: 'array',
      description:
        'Remote URL to download the FHIR Implementation Guide package dependencies. Example: --remoteDependencyUrl https://fhir.org.nz/ig/base/package.tgz',
      demandOption: false,
    })
    .option('dereferenceOutput', {
      default: true,
      type: 'boolean',
      description:
        'Whether or not to dereference the output OpenAPI specification. Example: --dereferenceOutput false',
      demandOption: false,
    })
    .option('persistFiles', {
      default: false,
      alias: 'p',
      type: 'boolean',
      description:
        'Whether or not downloaded Implementation Guides should be persisted for debugging. Example: --persistFiles true',
      demandOption: false,
    })
    .option('dedupeSchemas', {
      default: false,
      alias: 'dp',
      type: 'boolean',
      description:
        'Whether or not to de-dedupe schemas to reduce spec size. Example: --dedupeSchemas false',
      demandOption: false,
    })
    .option('contentType', {
      default: 'application/json',
      alias: 'ct',
      type: 'string',
      description:
        'The content type used by the API e.g. application/json or application/fhir+json. Example: --contentType application/fhir+json',
      demandOption: false,
    })
    .option('defaultResponses', {
      default: '400,401,403,500',
      alias: 'dr',
      type: 'string',
      description:
        'Comma separated string of http status codes which the tool adds the default operationoutcome alongside 200/201',
      demandOption: false,
    })
    .conflicts('inputFolder', 'remoteUrl')
    .check((argv) => {
      if (!argv.inputFolder && !argv.remoteUrl) {
        throw new Error('Either inputFolder or remoteUrl must be provided.');
      }

      // Custom validation for defaultResponses
      const defaultResponsesPattern = /^(\d{3})(,\d{3})*$/;
      if (!defaultResponsesPattern.test(argv.defaultResponses)) {
        throw new Error(
          'defaultResponses must be a comma-separated string of three-digit HTTP status codes.'
        );
      }

      return true;
    })
    .version(false).argv;
};

module.exports = { getArgs };

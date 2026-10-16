import fs from 'fs';
import zlib from 'zlib';
import util from 'util';
import { pipeline } from 'stream/promises';
import tmp from 'tmp';
import * as tar from 'tar';
import { walk, type Entry } from '@nodelib/fs.walk';
import logger from '../logger';
import { CAPABILITY_STATEMENT_URL } from '../constants';
import { IgIndex } from './IgIndex';
import type { CapabilityStatement, CliOptions } from '../types';

// Set up graceful cleanup of temporary files
tmp.setGracefulCleanup();

/**
 * Downloads and extracts FHIR IG packages into one temporary directory.
 * Downloaded files are kept for debugging when `persistFiles` is true.
 */
async function downloadPackages(
  urls: string[],
  persistFiles: boolean
): Promise<string> {
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
      await pipeline(response.body!, fs.createWriteStream(packagePath));
      await pipeline(
        fs.createReadStream(packagePath),
        zlib.createGunzip(),
        tar.extract({ cwd: extractPath })
      );
    })
  );

  return extractPath;
}

/** Parses JSON, returning an empty object when the text is not valid JSON. */
function safeJSONParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

/** Indexes every JSON file under `directory`. */
async function indexDirectory(directory: string): Promise<IgIndex> {
  logger.debug('Reading directory json files:', { directory });
  const entries: Entry[] = await util.promisify(walk)(directory, {
    entryFilter: (entry) => entry.name.endsWith('.json'),
    stats: true,
  });
  return IgIndex.fromResources(
    entries.map((entry) => safeJSONParse(fs.readFileSync(entry.path, 'utf8')))
  );
}

/**
 * Loads the IG from `inputFolder`, or downloads it from `remoteUrl` (plus any
 * dependencies), and returns the CapabilityStatements that declare the HNZ
 * capability statement profile.
 */
export async function getFHIRArtifacts(
  options: Pick<
    CliOptions,
    'inputFolder' | 'remoteUrl' | 'remoteDependencyUrl' | 'persistFiles'
  >
): Promise<{
  capabilityStatements: CapabilityStatement[];
  packageDirectory: string;
  ig: IgIndex;
}> {
  const directory =
    options.inputFolder ||
    (await downloadPackages(
      [options.remoteUrl!, ...(options.remoteDependencyUrl || [])],
      options.persistFiles
    ));
  const ig = await indexDirectory(directory);
  const capabilityStatements = ig.capabilityStatements.filter(
    (capabilityStatement) => {
      if (
        capabilityStatement.meta?.profile!.includes(CAPABILITY_STATEMENT_URL)
      ) {
        return true;
      }
      logger.warn(
        `Ignoring CapabilityStatement with URL: ${capabilityStatement.id}, must be InstanceOf ${CAPABILITY_STATEMENT_URL}`
      );
      return false;
    }
  );

  return { capabilityStatements, packageDirectory: directory, ig };
}

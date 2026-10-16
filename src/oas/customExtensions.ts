import { log } from '../log';
import { CAPABILITY_STATEMENT_EXTENSIONS_URL } from '../constants';
import type { CapabilityStatement, Extension, GlobalHeader } from '../types';

const findExtension = (extensions: Extension[] | undefined, url: string) =>
  extensions?.find((extension) => extension.url === url);

/**
 * Reads the HNZ resource-metadata extension on a CapabilityStatement: licence,
 * external docs and the custom headers added to every operation.
 */
export const extractCustomExtensions = (
  capabilityStatement: CapabilityStatement
) => {
  const customDetails = findExtension(
    capabilityStatement?.extension,
    CAPABILITY_STATEMENT_EXTENSIONS_URL
  );

  const globalHeaders: Record<string, GlobalHeader>[] = [];
  for (const header of customDetails?.extension ?? []) {
    if (header.url !== 'globalHeaders' || !header.extension) continue;
    header.extension.forEach((item) => {
      const keyExtension = findExtension(item.extension, 'key');
      const valueExtension = findExtension(item.extension, 'value');
      const requiredExtension = findExtension(item.extension, 'required');
      const documentationExtension = findExtension(
        item.extension,
        'documentation'
      );

      if (keyExtension?.valueString && valueExtension?.valueUri) {
        globalHeaders.push({
          [keyExtension.valueString]: {
            value: valueExtension.valueUri,
            required: requiredExtension?.valueBoolean || false,
            ...(documentationExtension?.valueString
              ? { documentation: documentationExtension.valueString }
              : {}),
          },
        });
      } else {
        log.debug('Invalid header configuration:', item);
      }
    });
  }

  const licenseURL = findExtension(
    customDetails?.extension,
    'licenseURL'
  )?.valueUri;
  const licenseName = findExtension(
    customDetails?.extension,
    'licenseName'
  )?.valueString;
  const externalDocs = findExtension(
    customDetails?.extension,
    'externalDocs'
  )?.valueUri;

  log.debug('Custom globalHeaders found:', { globalHeaders });
  log.debug('licenseName:', { licenseName });
  log.debug('externalDocs:', { externalDocs });

  return {
    licenseURL,
    licenseName,
    externalDocs,
    ...(globalHeaders.length > 0 ? { globalHeaders } : {}),
  };
};

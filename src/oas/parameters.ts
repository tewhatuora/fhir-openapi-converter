import type { OpenAPIV3 } from 'openapi-types';
import { log } from '../log';
import { MANDATORY_SEARCH_PARAM_EXTENSION_URL } from '../constants';
import type { Extension, GlobalHeader, SearchParam } from '../types';

/** Converts a CapabilityStatement search parameter to a query parameter. */
export const renderParameter = (
  searchParam: SearchParam,
  resourceExtension: Extension[] = []
): OpenAPIV3.ParameterObject => {
  const mandatorySearchParam = resourceExtension.find(
    (ext) =>
      ext.url === MANDATORY_SEARCH_PARAM_EXTENSION_URL &&
      ext?.extension!.find(
        (e) => e.url === 'required' && e.valueString === searchParam.name
      )
  );

  if (mandatorySearchParam) {
    log.debug(`Found mandatory search parameter ${searchParam.name}`);
  }
  const required = mandatorySearchParam ? true : false;

  // Property order differs between cases and is kept for stable output.
  switch (searchParam.type) {
    case 'number':
      return {
        name: searchParam.name,
        in: 'query',
        required,
        schema: { type: 'integer' },
        example: 123456,
      };
    case 'date':
      return {
        name: searchParam.name,
        in: 'query',
        style: 'form',
        explode: true,
        required,
        schema: { type: 'string' },
        examples: {
          date: {
            value: '2024-12-02',
          },
        },
      };
    case 'token':
    case 'reference':
    case 'composite':
    case 'quantity':
    case 'uri':
    case 'string':
    case 'special':
      return {
        name: searchParam.name,
        required,
        in: 'query',
        schema: { type: 'string' },
      };
    default:
      log.debug(
        `Unsupported parameter found ${searchParam.name}: ${searchParam.type}`
      );
      return {
        name: searchParam.name,
        in: 'query',
        schema: { type: 'string' },
        required,
      };
  }
};

export const getPathParameter = (
  name: string,
  description: string
): OpenAPIV3.ParameterObject => {
  return {
    description,
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  };
};

/** Header parameters for the CapabilityStatement's global headers. */
export const headerParameters = (
  globalHeaders: Record<string, GlobalHeader>[] | undefined
): OpenAPIV3.ParameterObject[] =>
  (globalHeaders ?? []).flatMap((header) => {
    // This ensures that there is actually a key-value pair in the header object.
    if (Object.keys(header).length === 0) {
      return [];
    }

    const [name, details] = Object.entries(header)[0];
    if (!name || !details) {
      log.error('Invalid header configuration:', header);
      return [];
    }

    return [
      {
        name: name,
        in: 'header',
        required: details.required,
        ...(details.documentation
          ? { description: details.documentation }
          : {}),
        // `type` alongside `$ref` is not valid OpenAPI but is kept for
        // compatibility with existing output.
        schema: {
          type: 'string',
          $ref: details.value,
        } as OpenAPIV3.SchemaObject,
      },
    ];
  });

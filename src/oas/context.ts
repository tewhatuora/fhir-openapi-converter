import type { OpenAPIV3 } from 'openapi-types';
import type { IgIndex } from '../ig/IgIndex';
import type { CapabilityStatement } from '../types';
import { extractCustomExtensions } from './customExtensions';
import { headerParameters } from './parameters';
import { createSecurityModel, type SecurityModel } from './security';
import { fetchBaseOasSchema } from './profiles';

export interface GeneratorOptions {
  contentType: string[];
  /** Comma-separated status codes that get an OperationOutcome response. */
  defaultResponses: string;
  /** Scope used for every operation when the OAuth scheme is declared. */
  defaultOAuthScope?: string;
  /** Loads the base OpenAPI schema for a resource type (defaults to fetching it). */
  fetchBaseSchema?: (resourceType: string) => Promise<OpenAPIV3.SchemaObject>;
}

/** Everything the path builders need for one CapabilityStatement. */
export interface GenerationContext {
  readonly capabilityStatement: CapabilityStatement;
  readonly ig: IgIndex;
  readonly serverUrl: string | undefined;
  readonly details: ReturnType<typeof extractCustomExtensions>;
  readonly security: SecurityModel;
  readonly defaultResponseCodes: number[];
  /** A `content` map with one entry per content type, from a factory. */
  content(
    mediaType: () => OpenAPIV3.MediaTypeObject
  ): Record<string, OpenAPIV3.MediaTypeObject>;
  /** Parameters for the CapabilityStatement's global headers (a new array). */
  headerParameters(): OpenAPIV3.ParameterObject[];
  /** A private copy of a base resource schema; each type is loaded once. */
  baseSchema(resourceType: string): Promise<OpenAPIV3.SchemaObject>;
}

/**
 * Builds the context for one CapabilityStatement. Throws if the statement
 * declares OAuth security and no default OAuth scope was given.
 */
export const createContext = (
  options: GeneratorOptions,
  ig: IgIndex,
  capabilityStatement: CapabilityStatement
): GenerationContext => {
  const details = extractCustomExtensions(capabilityStatement);
  const security = createSecurityModel(
    capabilityStatement.rest?.[0].security,
    options.defaultOAuthScope
  );
  const fetchBaseSchema = options.fetchBaseSchema ?? fetchBaseOasSchema;
  const baseSchemas = new Map<string, Promise<OpenAPIV3.SchemaObject>>();

  return {
    capabilityStatement,
    ig,
    serverUrl: capabilityStatement.implementation?.url,
    details,
    security,
    defaultResponseCodes: options.defaultResponses
      .split(',')
      .map((code) => parseInt(code, 10)),
    content: (mediaType) =>
      Object.fromEntries(
        options.contentType.map((type) => [type, mediaType()])
      ),
    headerParameters: () => headerParameters(details.globalHeaders),
    baseSchema: async (resourceType) => {
      if (!baseSchemas.has(resourceType)) {
        baseSchemas.set(resourceType, fetchBaseSchema(resourceType));
      }
      return structuredClone(await baseSchemas.get(resourceType)!);
    },
  };
};

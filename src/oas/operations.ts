import type { OpenAPIV3 } from 'openapi-types';
import { OAS_SCHEMA_BASE_URL } from '../constants';
import { parametersResourceSchema } from './fhirSchemas';
import { errorResponses } from './responses';
import { operationSecurity } from './security';
import type { GenerationContext } from './context';
import type {
  OperationDefinition,
  OperationDefinitionParameter,
  RestOperation,
} from '../types';

/**
 * NOTE: FHIR names this field `documentation`; the converter has always read
 * `description`, so parameter and response descriptions fall back to the
 * defaults. Kept for output compatibility.
 */
type LegacyParameter = OperationDefinitionParameter & { description?: string };

type Ctx = Pick<
  GenerationContext,
  'ig' | 'content' | 'defaultResponseCodes' | 'headerParameters' | 'security'
>;

export type CustomOperations = Partial<
  Record<'get' | 'post', OpenAPIV3.OperationObject>
>;

const FHIR_PRIMITIVE_TYPES = new Set([
  'base64Binary',
  'boolean',
  'canonical',
  'code',
  'date',
  'dateTime',
  'decimal',
  'id',
  'instant',
  'integer',
  'markdown',
  'oid',
  'positiveInt',
  'string',
  'time',
  'unsignedInt',
  'uri',
  'url',
  'uuid',
]);

const inputParameters = (definition: OperationDefinition) =>
  (definition.parameter || []).filter((param) => param.use === 'in');

/**
 * Queries always use GET. Other operations use GET only when they do not
 * affect state and every input is a primitive (so it fits in the query
 * string); everything else uses POST with a Parameters body.
 */
const supportsGet = (definition: OperationDefinition): boolean => {
  if (definition.kind === 'query') return true;
  return (
    definition.kind === 'operation' &&
    definition.affectsState === false &&
    inputParameters(definition).every((param) =>
      FHIR_PRIMITIVE_TYPES.has(param.type!)
    )
  );
};

/**
 * 200 response: a sole output named `return` is the resource itself;
 * otherwise outputs are wrapped in a Parameters resource. No outputs, no body.
 */
const operationResponses = (
  ctx: Ctx,
  definition: OperationDefinition
): OpenAPIV3.ResponsesObject => {
  const outputs: LegacyParameter[] = (definition.parameter || []).filter(
    (param) => param.use === 'out'
  );
  const directReturn = outputs.length === 1 && outputs[0].name === 'return';
  const schema = directReturn
    ? { $ref: `${OAS_SCHEMA_BASE_URL}${outputs[0].type}-definition.json` }
    : parametersResourceSchema();

  return {
    200: {
      description: outputs[0]?.description || 'Successful response',
      ...(outputs.length ? { content: ctx.content(() => ({ schema })) } : {}),
    },
    ...errorResponses(ctx, definition.name),
  };
};

const queryParameters = (
  definition: OperationDefinition
): OpenAPIV3.ParameterObject[] =>
  inputParameters(definition).map((param: LegacyParameter) => ({
    name: param.name,
    ...(param.description ? { description: param.description } : {}),
    in: 'query',
    required: param.min > 0,
    schema: { type: 'string' },
  }));

/**
 * The GET or POST operation for a CapabilityStatement operation. `scope` is
 * the resource type, or `system`, and is used as the tag.
 */
export const buildCustomOperation = (
  ctx: Ctx,
  operation: RestOperation,
  scope: string
): { definition: OperationDefinition; operations: CustomOperations } => {
  const definition = ctx.ig.operationDefinition(operation.definition);
  if (!definition) {
    throw new Error(
      `Operation definition ${operation.definition} not found in the implementation guide`
    );
  }

  const common = {
    summary: definition.name || `Custom operation ${definition.code}`,
    description:
      definition.description || `Custom operation ${definition.code} ${scope}`,
    tags: [scope],
    responses: operationResponses(ctx, definition),
  };
  const security = operationSecurity(ctx.security, () => [definition.url!]);

  const operations: CustomOperations = supportsGet(definition)
    ? {
        get: {
          ...common,
          parameters: [
            ...ctx.headerParameters(),
            ...queryParameters(definition),
          ],
          ...security,
        },
      }
    : {
        post: {
          ...common,
          parameters: ctx.headerParameters(),
          ...security,
          requestBody: {
            content: ctx.content(() => ({
              schema: parametersResourceSchema(),
            })),
          },
        },
      };
  return { definition, operations };
};

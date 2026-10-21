import type { OpenAPIV3 } from 'openapi-types';
import { OAS_SCHEMA_BASE_URL } from '../constants';
import { bundleResponseSchema } from './fhirSchemas';
import { searchsetExamples } from './examples';
import type { GenerationContext } from './context';
import type { ExampleRefs, InteractionType, RestResource } from '../types';

type Ctx = Pick<
  GenerationContext,
  'content' | 'defaultResponseCodes' | 'ig' | 'serverUrl'
>;

const operationOutcomeContent = (ctx: Pick<GenerationContext, 'content'>) =>
  ctx.content(() => ({
    schema: { $ref: `${OAS_SCHEMA_BASE_URL}OperationOutcome-definition.json` },
  }));

/** An OperationOutcome response for each configured default status code. */
export const errorResponses = (
  ctx: Pick<GenerationContext, 'content' | 'defaultResponseCodes'>,
  label: string | undefined
): OpenAPIV3.ResponsesObject =>
  Object.fromEntries(
    ctx.defaultResponseCodes.map((statusCode) => [
      statusCode,
      {
        description: `Unsuccessful ${label} operation - ${statusCode}`,
        content: operationOutcomeContent(ctx),
      },
    ])
  );

/** References to the profile schemas a resource supports. */
export interface ResourceSchemas {
  profileRefs: OpenAPIV3.ReferenceObject[];
  examples: ExampleRefs;
}

/**
 * Responses for a resource interaction: 201 for create, otherwise 200
 * (OperationOutcome for delete, a searchset Bundle for search, else any of
 * the resource's profiles), plus the default error responses.
 */
export const interactionResponses = (
  ctx: Ctx,
  interactionType: InteractionType,
  resource: RestResource,
  { profileRefs, examples }: ResourceSchemas
): OpenAPIV3.ResponsesObject => {
  const hasExamples = Object.keys(examples).length > 0;
  let content: Record<string, OpenAPIV3.MediaTypeObject>;
  if (interactionType === 'delete') {
    content = operationOutcomeContent(ctx);
  } else if (interactionType === 'search') {
    content = ctx.content(() => ({
      schema: bundleResponseSchema([], profileRefs, ['searchset']),
      ...(hasExamples
        ? { examples: searchsetExamples(ctx, resource.type) }
        : {}),
    }));
  } else {
    content = ctx.content(() => ({
      schema: { anyOf: [...profileRefs] },
      ...(hasExamples ? { examples } : {}),
    }));
  }

  return {
    ...errorResponses(ctx, interactionType),
    [interactionType === 'create' ? 201 : 200]: {
      description: `Successful ${interactionType} operation`,
      content,
    },
  };
};

/**
 * Request body for create/update/patch: any of the resource's profiles.
 * Create examples point at the `-create` variants, which have no id.
 */
export const interactionRequestBody = (
  ctx: Pick<GenerationContext, 'content'>,
  interactionType: InteractionType,
  resource: RestResource,
  { profileRefs, examples }: ResourceSchemas
): OpenAPIV3.RequestBodyObject => {
  const suffix = interactionType === 'create' ? '-create' : '';
  const exampleEntries = Object.keys(examples).length
    ? Object.fromEntries(
        Object.entries(examples).map(([key, { $ref }]) => [
          `${key}${suffix}`,
          { $ref: `${$ref}${suffix}` },
        ])
      )
    : undefined;

  return {
    // Also used for update and patch (KNOWN_ISSUES.md #8).
    description: `${resource.type} to create`,
    required: true,
    content: ctx.content(() => ({
      schema: { anyOf: [...profileRefs] },
      ...(exampleEntries && { examples: exampleEntries }),
    })),
  };
};

import type { OpenAPIV3 } from 'openapi-types';
import { log } from '../log';
import { OAS_SCHEMA_BASE_URL } from '../constants';
import { renderParameter, getPathParameter } from './parameters';
import { interactionRequestBody, interactionResponses } from './responses';
import type { ResourceSchemas } from './responses';
import { exampleRefs } from './examples';
import { operationSecurity, resourceScopes } from './security';
import { resolveProfileSchemas, type ProfileSchema } from './profiles';
import { bundleRequestSchema, bundleResponseSchema } from './fhirSchemas';
import { buildCustomOperation } from './operations';
import type { GenerationContext } from './context';
import type {
  InteractionType,
  RestInteraction,
  RestOperation,
  RestResource,
} from '../types';

type Paths = Record<string, OpenAPIV3.PathItemObject>;
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface BuiltPaths {
  paths: Paths;
  /** Profile schemas for `components.schemas`. */
  schemas: ProfileSchema[];
  /** Keys of the IG examples referenced from the paths. */
  exampleKeys: string[];
  /** Tags used by resource-level operations, in first-use order. */
  tags: string[];
}

interface InteractionSpec {
  method: HttpMethod;
  path: (type: string) => string;
  summary: (type: string) => string;
  operationIdPrefix: string;
  interactionType: InteractionType;
  /** SMART permission letter, e.g. `r` in `system/Patient.r`. */
  smartPermission: 'c' | 'r' | 'u' | 'd' | 's';
  pathParameters: [name: string, description: string][];
  hasRequestBody: boolean;
}

const RID: [string, string] = ['rid', 'Resource id'];
const VID: [string, string] = ['vid', 'Resource version id'];

/** How each CapabilityStatement resource interaction maps to an operation. */
const INTERACTIONS: Record<string, InteractionSpec> = {
  read: {
    method: 'get',
    path: (type) => `/${type}/{rid}`,
    summary: (type) => `Read ${type}`,
    operationIdPrefix: 'read',
    interactionType: 'read',
    smartPermission: 'r',
    pathParameters: [RID],
    hasRequestBody: false,
  },
  vread: {
    method: 'get',
    path: (type) => `/${type}/{rid}/_history/{vid}`,
    summary: (type) => `Read ${type} (versioned)`,
    operationIdPrefix: 'vread',
    interactionType: 'vread',
    smartPermission: 'r',
    pathParameters: [RID, VID],
    hasRequestBody: false,
  },
  'search-type': {
    method: 'get',
    path: (type) => `/${type}`,
    summary: (type) => `Search for ${type}`,
    operationIdPrefix: 'search',
    interactionType: 'search',
    smartPermission: 's',
    pathParameters: [],
    hasRequestBody: false,
  },
  create: {
    method: 'post',
    path: (type) => `/${type}`,
    summary: (type) => `Create ${type}`,
    operationIdPrefix: 'create',
    interactionType: 'create',
    smartPermission: 'c',
    pathParameters: [],
    hasRequestBody: true,
  },
  update: {
    method: 'put',
    path: (type) => `/${type}/{rid}`,
    summary: (type) => `Update ${type}`,
    operationIdPrefix: 'update',
    interactionType: 'update',
    smartPermission: 'u',
    pathParameters: [RID],
    hasRequestBody: true,
  },
  patch: {
    method: 'patch',
    path: (type) => `/${type}/{rid}`,
    summary: (type) => `Patch for ${type}`,
    operationIdPrefix: 'patch',
    interactionType: 'patch',
    smartPermission: 'u',
    pathParameters: [RID],
    hasRequestBody: true,
  },
  delete: {
    method: 'delete',
    path: (type) => `/${type}/{rid}`,
    summary: (type) => `Delete ${type}`,
    operationIdPrefix: 'delete',
    interactionType: 'delete',
    smartPermission: 'd',
    pathParameters: [RID],
    hasRequestBody: false,
  },
};

/** Sets `operations` on `paths[pathKey]`, keeping the path's position. */
const addOrUpdatePath = (
  paths: Paths,
  pathKey: string,
  operations: OpenAPIV3.PathItemObject
) => {
  paths[pathKey] = Object.assign(paths[pathKey] || {}, operations);
};

const interactionOperation = (
  ctx: GenerationContext,
  spec: InteractionSpec,
  resource: RestResource,
  schemas: ResourceSchemas,
  documentation: string | undefined
): OpenAPIV3.OperationObject => {
  const { type } = resource;
  log.debug(`Building ${spec.operationIdPrefix} path for ${type}`);
  const searchParameters =
    spec.interactionType === 'search'
      ? (resource.searchParam || []).map((param) =>
          renderParameter(param, resource.extension)
        )
      : [];
  return {
    summary: spec.summary(type),
    description: documentation || spec.summary(type),
    tags: [type],
    operationId: `${spec.operationIdPrefix}${type}`,
    parameters: [
      ...ctx.headerParameters(),
      ...spec.pathParameters.map(([name, description]) =>
        getPathParameter(name, description)
      ),
      ...searchParameters,
    ],
    responses: interactionResponses(
      ctx,
      spec.interactionType,
      resource,
      schemas
    ),
    ...(spec.hasRequestBody
      ? {
          requestBody: interactionRequestBody(
            ctx,
            spec.interactionType,
            resource,
            schemas
          ),
        }
      : {}),
    ...operationSecurity(ctx.security, () =>
      resourceScopes(ctx.security, type, spec.smartPermission)
    ),
  };
};

/**
 * Builds every path for the CapabilityStatement's server `rest` entry:
 * system interactions and operations, then each resource's interactions,
 * `/metadata` and custom operations.
 */
export const buildPaths = async (
  ctx: GenerationContext
): Promise<BuiltPaths> => {
  const { capabilityStatement } = ctx;
  const serverRest = capabilityStatement.rest?.find(
    (rest) => rest.mode === 'server'
  );
  if (!serverRest) {
    throw new Error(
      `CapabilityStatement ${capabilityStatement.id} has no rest entry with mode "server"`
    );
  }

  const paths = systemPaths(ctx, serverRest.interaction, serverRest.operation);
  const schemas: ProfileSchema[] = [];
  const exampleKeys = new Set<string>();
  const tags = new Set<string>();
  for (const resource of serverRest.resource ?? []) {
    const resourcePaths = await buildResourcePaths(ctx, resource);
    schemas.push(...resourcePaths.schemas);
    resourcePaths.exampleKeys.forEach((key) => exampleKeys.add(key));
    for (const [path, operations] of Object.entries(resourcePaths.paths)) {
      addOrUpdatePath(paths, path, operations);
      Object.values(operations).forEach((operation) =>
        (operation as OpenAPIV3.OperationObject).tags?.forEach((tag) =>
          tags.add(tag)
        )
      );
    }
  }
  return {
    paths,
    schemas,
    exampleKeys: [...exampleKeys],
    tags: [...tags],
  };
};

/** `POST /` for batch/transaction, plus system-level custom operations. */
const systemPaths = (
  ctx: GenerationContext,
  interactions: Pick<RestInteraction, 'code'>[] | undefined,
  operations: RestOperation[] | undefined
): Paths => {
  const paths: Paths = {};
  if (interactions?.length) {
    paths['/'] = {
      post: {
        summary: 'System level interactions',
        description: 'System level interactions',
        tags: ['system'],
        operationId: 'systemInteractions',
        parameters: ctx.headerParameters(),
        responses: {
          200: {
            description: 'Successful system level interaction',
            content: ctx.content(() => ({
              schema: bundleResponseSchema(interactions),
            })),
          },
        },
        requestBody: {
          content: ctx.content(() => ({
            schema: bundleRequestSchema(interactions),
          })),
        },
      },
    };
  }
  for (const operation of operations ?? []) {
    const { operations: methods } = buildCustomOperation(
      ctx,
      operation,
      'system'
    );
    Object.values(methods).forEach((op) => {
      op.operationId = `custom-${operation.name}-system`;
    });
    paths[`/$${operation.name}`] = methods;
  }
  return paths;
};

const metadataPath = (ctx: GenerationContext): OpenAPIV3.PathItemObject => ({
  get: {
    summary: 'Get CapabilityStatement',
    description: 'Returns the FHIR CapabilityStatement for this server',
    tags: ['metadata'],
    operationId: 'getCapabilityStatement',
    parameters: ctx.headerParameters(),
    responses: {
      200: {
        description: 'Successful retrieval of the CapabilityStatement',
        content: ctx.content(() => ({
          schema: {
            $ref: `${OAS_SCHEMA_BASE_URL}CapabilityStatement-definition.json`,
          },
          examples: {
            CapabilityStatement: { value: ctx.capabilityStatement },
          },
        })),
      },
    },
  },
});

/**
 * Paths for one resource: its interactions, `/metadata` and its custom
 * operations, plus the profile schemas and example keys they reference.
 */
const buildResourcePaths = async (
  ctx: GenerationContext,
  resource: RestResource
) => {
  const { type, interaction, operation } = resource;
  log.debug(
    `Building paths for ${type}. ${interaction?.length || 0} interactions found. ${operation?.length || 0} custom operations found.`
  );
  log.debug(`Supported profiles: ${resource.supportedProfile}`);
  log.debug(`Base profile: ${resource.profile || 'not supplied'}`);

  const schemas = await resolveProfileSchemas(ctx, resource);
  const resourceSchemas: ResourceSchemas = {
    profileRefs: schemas.map(({ key }) => ({
      $ref: `#/components/schemas/${key}`,
    })),
    examples: exampleRefs(ctx.ig, schemas),
  };
  const paths: Paths = {};

  // Interactions with a request body (create/update/patch) go after the
  // others, matching the operation order the converter has always produced.
  const supported = interaction!.filter(({ code }) => {
    if (Object.hasOwn(INTERACTIONS, code)) return true;
    log.debug(`Unsupported interaction found for ${type}: ${code}`);
    return false;
  });
  const ordered = [
    ...supported.filter(({ code }) => !INTERACTIONS[code].hasRequestBody),
    ...supported.filter(({ code }) => INTERACTIONS[code].hasRequestBody),
  ];
  for (const { code, documentation } of ordered) {
    const spec = INTERACTIONS[code];
    addOrUpdatePath(paths, spec.path(type), {
      [spec.method]: interactionOperation(
        ctx,
        spec,
        resource,
        resourceSchemas,
        documentation
      ),
    });
  }

  const customPaths: Paths = {};
  for (const op of operation ?? []) {
    const { definition, operations } = buildCustomOperation(ctx, op, type);
    // NOTE: if a definition is both instance- and type-level, the two paths
    // share the same operation objects, so the type path also gets the `rid`
    // parameter and the `-type` operationId. Kept for output compatibility.
    if (definition.instance) {
      Object.values(operations).forEach((method) => {
        method.parameters?.push(getPathParameter('rid', 'Resource id'));
        method.operationId = `custom-${op.name}-${type}-instance`;
      });
      customPaths[`/${type}/{rid}/$${op.name}`] = { ...operations };
    }
    if (definition.type) {
      Object.values(operations).forEach((method) => {
        method.operationId = `custom-${op.name}-${type}-type`;
      });
      customPaths[`/${type}/$${op.name}`] = { ...operations };
    }
  }

  addOrUpdatePath(paths, '/metadata', metadataPath(ctx));
  for (const [pathKey, operations] of Object.entries(customPaths)) {
    addOrUpdatePath(paths, pathKey, operations);
  }
  return {
    paths,
    schemas,
    exampleKeys: Object.keys(resourceSchemas.examples),
  };
};

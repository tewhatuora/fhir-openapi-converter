import type { OpenAPIV3 } from 'openapi-types';
import { log } from '../log';
import { OAS_SCHEMA_BASE_URL } from '../constants';
import type {
  ElementDefinition,
  RestResource,
  StructureDefinition,
} from '../types';
import type { GenerationContext } from './context';

type Schema = OpenAPIV3.SchemaObject;
type ObjectSchema = OpenAPIV3.NonArraySchemaObject;

/** A profile resolved to a schema, stored under `#/components/schemas/<key>`. */
export interface ProfileSchema {
  key: string;
  schema: Schema;
}

/**
 * Resolves each profile a resource supports to a schema: the base FHIR
 * schema with the profile's differential applied. The core FHIR profile (used
 * when none is declared) maps to the unmodified base schema, keyed as
 * `Base-Profile-<type>`. Profiles missing from the IG are logged and keyed as
 * `undefined-undefined`.
 */
export const resolveProfileSchemas = async (
  ctx: Pick<GenerationContext, 'ig' | 'baseSchema'>,
  resource: RestResource
): Promise<ProfileSchema[]> => {
  const { type } = resource;
  const coreProfile = `http://hl7.org/fhir/StructureDefinition/${type}`;
  const profiles = [
    ...(resource.profile ? [resource.profile] : []),
    ...(resource.supportedProfile ?? []),
  ];
  if (profiles.length === 0) profiles.push(coreProfile);

  const baseSchema = await ctx.baseSchema(type);
  return Promise.all(
    profiles.map(async (profile): Promise<ProfileSchema> => {
      if (profile === coreProfile) {
        return {
          key: `Base-Profile-${type}`,
          schema: await ctx.baseSchema(type),
        };
      }
      const structureDefinition = ctx.ig.structureDefinition(profile);
      if (!structureDefinition) {
        log.warn(`Profile ${profile} not found`);
      }
      return {
        key: `${structureDefinition?.resourceType}-${structureDefinition?.id}`,
        schema: applyStructureDefinitionChanges(
          baseSchema,
          structureDefinition
        ),
      };
    })
  );
};

/** Fetches the flattened base OpenAPI schema for a FHIR resource type. */
export const fetchBaseOasSchema = async (type: string): Promise<Schema> => {
  log.debug(`Fetching Base OAS schema for ${type}`);
  const res = await fetch(`${OAS_SCHEMA_BASE_URL}${type}-definition.json`);
  return (await res.json()) as Schema;
};

/**
 * Returns a copy of `schema` with the StructureDefinition's differential
 * applied. Slices are ignored.
 */
export const applyStructureDefinitionChanges = (
  schema: Schema,
  structureDefinition: StructureDefinition | undefined
): Schema => {
  const updatedSchema: Schema = structuredClone(schema);
  if (!structureDefinition?.differential) {
    return updatedSchema;
  }
  updatedSchema.description = structureDefinition.url;

  for (const element of structureDefinition.differential.element!) {
    if (element.id!.includes(':')) {
      log.debug(`Ignoring element slice with id: ${element.id}`);
      continue;
    }
    const path = element.path.replace(`${structureDefinition.type}.`, '');
    const [parent, name] = parentSchema(updatedSchema, path);
    applyCardinality(parent, name, element);
    applyPattern(parent, name, element);
  }
  return updatedSchema;
};

/**
 * Walks to the schema that holds the last path segment, creating object
 * schemas for missing intermediate segments.
 */
const parentSchema = (schema: Schema, path: string): [ObjectSchema, string] => {
  const parts = path.split('.');
  let current = schema as ObjectSchema;
  for (const part of parts.slice(0, -1)) {
    current.properties = current.properties || {};
    current.properties[part] = current.properties[part] || {
      type: 'object',
      properties: {},
    };
    current = current.properties[part] as ObjectSchema;
  }
  return [current, parts[parts.length - 1]];
};

const addRequired = (schema: ObjectSchema, name: string) => {
  schema.required = schema.required || [];
  if (!schema.required.includes(name)) {
    schema.required.push(name);
  }
};

/**
 * min > 0 makes the property required (except choice types `[x]`) and sets
 * minItems on arrays; a numeric max sets maxItems; max 0 removes the property
 * and its `_` primitive extension.
 */
const applyCardinality = (
  parent: ObjectSchema,
  name: string,
  element: ElementDefinition
) => {
  const property = () => parent.properties?.[name] as Schema | undefined;

  if (element.min && element.min > 0) {
    if (!element.path.includes('[x]')) {
      addRequired(parent, name);
    } else {
      parent.required = parent.required || [];
    }
    const schema = property();
    if (schema?.type === 'array') {
      schema.minItems = Number(element.min);
    }
  }

  if (element.max && !['*', '0'].includes(element.max)) {
    // Throws if the property is not in the base schema, as it always has.
    const schema = parent.properties![name] as Schema;
    if (schema.type === 'array') {
      schema.maxItems = Number(element.max);
    }
  }

  if (element.max === '0' && parent.properties) {
    delete parent.properties[name];
    delete parent.properties[`_${name}`];
  }
};

/** Fixed pattern values become single-value enums; code and boolean are required. */
const applyPattern = (
  parent: ObjectSchema,
  name: string,
  element: ElementDefinition
) => {
  if (Object.hasOwn(element, 'patternCodeableConcept')) {
    const coding = element.patternCodeableConcept!.coding![0];
    parent.properties![name] = {
      type: 'object',
      properties: {
        coding: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              system: { type: 'string', enum: [coding.system] },
              code: { type: 'string', enum: [coding.code] },
            },
            required: ['system', 'code'],
          },
        },
      },
      required: ['coding'],
    };
  }
  if (Object.hasOwn(element, 'patternBoolean')) {
    parent.properties![name] = {
      type: 'boolean',
      enum: [element.patternBoolean],
    };
    addRequired(parent, name);
  }
  if (Object.hasOwn(element, 'patternCode')) {
    parent.properties = parent.properties || {};
    parent.properties[name] = { type: 'string', enum: [element.patternCode] };
    addRequired(parent, name);
  }
};

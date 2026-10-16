import type { OpenAPIV3 } from 'openapi-types';
import type { IgIndex } from '../ig/IgIndex';
import type { ExampleRefs, FhirResource } from '../types';
import type { GenerationContext } from './context';
import type { ProfileSchema } from './profiles';

const exampleKey = (example: FhirResource) =>
  `${example.resourceType}-${example.id}`;

/**
 * `#/components/examples` references for the IG examples of each profile.
 * Examples are matched on the schema's `description`, which is the profile
 * URL for profiles found in the IG.
 */
export const exampleRefs = (
  ig: IgIndex,
  profileSchemas: ProfileSchema[]
): ExampleRefs => {
  const refs: ExampleRefs = {};
  for (const { schema } of profileSchemas) {
    for (const example of ig.examplesForProfile(schema.description!)) {
      refs[exampleKey(example)] = {
        $ref: `#/components/examples/${exampleKey(example)}`,
      };
    }
  }
  return refs;
};

/** Every IG example of `resourceType`, wrapped in a searchset Bundle. */
export const searchsetExamples = (
  ctx: Pick<GenerationContext, 'ig' | 'serverUrl'>,
  resourceType: string
): Record<string, OpenAPIV3.ExampleObject> => {
  const examples = ctx.ig
    .allExamples()
    .filter((example) => example.resourceType === resourceType);
  if (!examples.length) return {};
  return {
    'searchset-example': {
      value: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: examples.map((example) => ({
          fullUrl: `${ctx.serverUrl}/${example.resourceType}/${example.id}`,
          resource: example,
          search: { mode: 'match' },
        })),
      },
    },
  };
};

/**
 * `components.examples` for the referenced keys: each example, plus a
 * `-create` variant without the id for create request bodies. If several
 * examples share a key, the last one loaded wins.
 */
export const componentExamples = (
  ig: IgIndex,
  keys: string[]
): Record<string, OpenAPIV3.ExampleObject> => {
  const wanted = new Set(keys);
  const examples: Record<string, OpenAPIV3.ExampleObject> = {};
  for (const example of ig.allExamples()) {
    const key = exampleKey(example);
    if (!wanted.has(key)) continue;
    const { id: _id, ...withoutId } = example;
    examples[key] = { value: example };
    examples[`${key}-create`] = { value: withoutId };
  }
  return examples;
};

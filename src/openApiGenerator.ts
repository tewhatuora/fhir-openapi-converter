import type { OpenAPIV3 } from 'openapi-types';
import type { IgIndex } from './ig/IgIndex';
import type { CapabilityStatement } from './types';
import { buildPaths } from './oas/paths';
import { createContext, type GeneratorOptions } from './oas/context';
import { buildSecuritySchemes, rootSecurity } from './oas/security';
import { componentExamples } from './oas/examples';

type Document = OpenAPIV3.Document;
type DocumentHeader = Omit<Document, 'paths'> & {
  'x-capabilitystatement-url'?: string;
  'x-capabilitystatement-id'?: string;
};

/**
 * Generates the OpenAPI document for one CapabilityStatement, using the
 * profiles, operations and examples in `ig`.
 */
export const generateOpenApiSpec = async (
  capabilityStatement: CapabilityStatement,
  ig: IgIndex,
  options: GeneratorOptions
): Promise<Document> => {
  const ctx = createContext(options, ig, capabilityStatement);
  const { paths, schemas, exampleKeys, tags } = await buildPaths(ctx);
  const securitySchemes = buildSecuritySchemes(ctx.security, paths);
  const hasSecurity = Object.keys(securitySchemes).length > 0;

  if (hasSecurity && paths['/']?.post) {
    paths['/'].post.security = rootSecurity(securitySchemes);
  }

  const components: OpenAPIV3.ComponentsObject = {
    ...(schemas.length && {
      schemas: Object.fromEntries(
        schemas.map(({ key, schema }) => [key, { ...schema }])
      ),
    }),
    ...(hasSecurity && { securitySchemes }),
    ...(exampleKeys.length && {
      examples: componentExamples(ig, exampleKeys),
    }),
  };

  const header = documentHeader(capabilityStatement, ctx.details);
  return {
    ...header,
    ...(Object.keys(paths).length && { paths }),
    ...(Object.keys(components).length && { components }),
    ...(tags.length && {
      tags: tags.map((tag) => ({
        name: tag,
        description: `Operations related to ${tag} FHIR resource`,
        externalDocs: {
          url: `https://www.hl7.org/fhir/${tag.toLowerCase()}.html`,
        },
      })),
    }),
  } as Document;
};

const documentHeader = (
  capabilityStatement: CapabilityStatement,
  details: ReturnType<typeof createContext>['details']
): DocumentHeader => {
  // The first contact with a URL telecom; its first telecom is used as the URL.
  const contact = capabilityStatement.contact?.find((contact) =>
    contact.telecom?.find((telecom) => telecom.system === 'url')
  );
  return {
    openapi: '3.0.3',
    'x-capabilitystatement-url': capabilityStatement.url,
    'x-capabilitystatement-id': capabilityStatement.id,
    info: {
      version: capabilityStatement.version!,
      title: capabilityStatement.description!,
      description: capabilityStatement.description,
      license: { name: details.licenseName!, url: details.licenseURL },
      contact: {
        name: contact?.name,
        url: contact?.telecom![0].value,
      },
    },
    externalDocs: {
      url: details.externalDocs!,
      description: 'FHIR Implementation Guide',
    },
    servers: [
      {
        url: capabilityStatement.implementation?.url as string,
        description: capabilityStatement.implementation?.description,
      },
    ],
  };
};

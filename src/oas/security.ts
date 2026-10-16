import type { OpenAPIV3 } from 'openapi-types';
import { log } from '../log';
import {
  SMART_CAPABILITIES_EXTENSION_URL,
  SMART_OAUTH_URIS_EXTENSION_URL,
} from '../constants';
import type { RestSecurity } from '../types';

export type SmartScopeBase = 'system' | 'user' | 'patient' | undefined;
type SchemeName = 'smartOnFhir' | 'OAuth';
export type SecuritySchemes = Partial<
  Record<SchemeName, OpenAPIV3.OAuth2SecurityScheme>
>;
type Paths = OpenAPIV3.PathsObject;

/** The security a CapabilityStatement declares. */
export interface SecurityModel {
  /** Declared schemes; flow scopes are filled in by `buildSecuritySchemes`. */
  schemes: SecuritySchemes;
  /** SMART scope bases (system/user/patient) for resource scopes. */
  smartScopeBases: SmartScopeBase[];
  defaultOAuthScope?: string;
}

/**
 * Reads the CapabilityStatement's `rest.security`. Throws when OAuth is
 * declared and no default OAuth scope is configured.
 */
export const createSecurityModel = (
  security: RestSecurity | undefined,
  defaultOAuthScope: string | undefined
): SecurityModel => {
  const model: SecurityModel = {
    schemes: {},
    smartScopeBases: [],
    defaultOAuthScope,
  };
  if (!security?.service?.length) {
    log.debug('No security schemes found in CapabilityStatement');
    return model;
  }
  for (const service of security.service) {
    const code = service.coding![0].code;
    if (code === 'SMART-on-FHIR') {
      log.debug('Found SMART-on-FHIR security scheme');
      model.schemes.smartOnFhir = oauthScheme(code, security);
      model.smartScopeBases = smartScopeBases(security);
    } else if (code === 'OAuth') {
      log.debug('Found OAuth security scheme');
      if (!defaultOAuthScope) {
        throw new Error(
          'Found OAuth security with no defaultOAuthScope defined in the configuration. Configure a defaultOAuthScope'
        );
      }
      model.schemes.OAuth = oauthScheme(code, security);
    } else {
      log.debug('Found unknown security scheme');
    }
  }
  return model;
};

/** Maps SMART `capabilities` codes to scope bases (unknown codes -> undefined). */
const smartScopeBases = (security: RestSecurity): SmartScopeBase[] => {
  const capabilities = security.extension?.filter(
    (ext) => ext.url === SMART_CAPABILITIES_EXTENSION_URL
  );
  if (!capabilities) {
    log.debug(
      `No SMART-on-FHIR capabilities found by extension "${SMART_CAPABILITIES_EXTENSION_URL}"`
    );
    return [];
  }
  const bases = capabilities.map((capability): SmartScopeBase => {
    switch (capability.valueCode) {
      case 'client-confidential-symmetric':
        return 'system';
      case 'permission-user':
        return 'user';
      case 'permission-patient':
        return 'patient';
    }
  });
  log.debug('Found SMART-on-FHIR base scopes', bases);
  return bases;
};

/** An OAuth2 scheme with the flows given by the SMART `oauth-uris` extension. */
const oauthScheme = (
  code: string,
  security: RestSecurity
): OpenAPIV3.OAuth2SecurityScheme => {
  const flows: OpenAPIV3.OAuth2SecurityScheme['flows'] = {};
  const uris = security.extension?.find(
    (ext) => ext.url === SMART_OAUTH_URIS_EXTENSION_URL
  );
  if (uris) {
    const authorize = uris.extension!.find((ext) => ext.url === 'authorize');
    const token = uris.extension!.find((ext) => ext.url === 'token');
    if (authorize) {
      log.debug('Found OAuth authorization code flow');
      flows.authorizationCode = {
        authorizationUrl: authorize.valueUri!,
        tokenUrl: token ? token.valueUri! : '',
        scopes: {},
      };
    }
    if (token) {
      log.debug('Found OAuth client credentials code flow');
      flows.clientCredentials = { tokenUrl: token.valueUri!, scopes: {} };
    }
  } else {
    log.debug(
      `Found no oAuth extensions from "${SMART_OAUTH_URIS_EXTENSION_URL}"`
    );
  }
  return { type: 'oauth2', description: `${code} security scheme`, flows };
};

/** e.g. `system/Patient.r` for each SMART scope base. */
export const resourceScopes = (
  model: SecurityModel,
  resourceType: string,
  permission: string
): string[] =>
  model.smartScopeBases.map((base) => `${base}/${resourceType}.${permission}`);

/**
 * Operation-level `security`. When OAuth is declared it wins and uses the
 * default scope; otherwise SMART uses the scopes from `smartScopes`.
 */
export const operationSecurity = (
  model: SecurityModel,
  smartScopes: () => string[]
): { security?: OpenAPIV3.SecurityRequirementObject[] } => {
  if (model.schemes.OAuth) {
    return { security: [{ OAuth: [model.defaultOAuthScope!] }] };
  }
  if (model.schemes.smartOnFhir) {
    return {
      security: smartScopes().map((scope) => ({ smartOnFhir: [scope] })),
    };
  }
  return {};
};

/**
 * The declared schemes with flow scopes filled in. SMART flows list the
 * scopes the operations use (system scopes for client credentials,
 * user/patient scopes for authorization code; operation URLs for both).
 * OAuth flows list the default scope.
 */
export const buildSecuritySchemes = (
  model: SecurityModel,
  paths: Paths
): SecuritySchemes => {
  const smartScopes = scopesUsed(paths, 'smartOnFhir');
  const smartScopesStartingWith = (...prefixes: string[]) =>
    describeScopes(
      smartScopes.filter((scope) =>
        prefixes.some((prefix) => scope.startsWith(prefix))
      )
    );
  const flowScopes: Record<
    SchemeName,
    Record<string, () => Record<string, string>>
  > = {
    smartOnFhir: {
      clientCredentials: () => smartScopesStartingWith('system', 'http'),
      authorizationCode: () =>
        smartScopesStartingWith('patient', 'user', 'http'),
    },
    OAuth: {
      clientCredentials: () => defaultScope(model),
      authorizationCode: () => defaultScope(model),
    },
  };

  return Object.fromEntries(
    Object.entries(model.schemes).map(([name, scheme]) => [
      name,
      {
        ...scheme,
        flows: Object.fromEntries(
          Object.entries(scheme.flows).map(([flowName, flow]) => [
            flowName,
            { ...flow, scopes: flowScopes[name as SchemeName][flowName]() },
          ])
        ),
      },
    ])
  );
};

const defaultScope = (model: SecurityModel) => ({
  [model.defaultOAuthScope!]: 'Default scope for all paths and operations',
});

/** `POST /` accepts any declared scope under any declared scheme. */
export const rootSecurity = (
  schemes: SecuritySchemes
): OpenAPIV3.SecurityRequirementObject[] => {
  const allScopes = new Set(
    Object.values(schemes).flatMap((scheme) =>
      Object.values(scheme.flows).flatMap((flow) => Object.keys(flow.scopes))
    )
  );
  return [...allScopes].flatMap((scope) =>
    Object.keys(schemes).map((name) => ({ [name]: [scope] }))
  );
};

/** Unique scopes used for `schemeName` across all operations, in path order. */
const scopesUsed = (paths: Paths, schemeName: string): string[] => {
  const scopes = new Set<string>();
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem!)) {
      for (const requirement of (operation as OpenAPIV3.OperationObject)
        .security ?? []) {
        requirement[schemeName]?.forEach((scope) => scopes.add(scope));
      }
    }
  }
  return [...scopes];
};

/** `{ "system/Patient.r": "Patient.r access" }` style descriptions. */
const describeScopes = (scopes: string[]): Record<string, string> =>
  Object.fromEntries(
    scopes.map((scope) => {
      const description = `${scope.split('/').pop()} access`;
      return [
        scope,
        description.charAt(0).toUpperCase() + description.slice(1),
      ];
    })
  );

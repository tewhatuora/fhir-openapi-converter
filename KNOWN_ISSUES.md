# Known issues

Known bugs and quirks in the converter. Most were found during the TypeScript refactor, which deliberately kept the generated output unchanged, so they are still present. Fix each as a separate, reviewed change, and call out any change to the generated OpenAPI for downstream consumers. Source comments refer to issues by number (for example `KNOWN_ISSUES.md #3`), so numbers are permanent: when an issue is fixed, remove its entry and those comments, and don't renumber the rest.

Locations name the function or type to look in, so they stay valid as the code changes.

## Incorrect or incomplete output

These affect specs generated from valid input.

- **#1 Profile constraints on children of array elements are lost.** A differential rule on a child of an array-typed element (for example `Patient.identifier.system` with `min: 1` or a `patternCode`) is written to `properties`/`required` on the array schema itself instead of its `items`. OpenAPI ignores `properties` on an array schema, so the constraint has no effect. Most FHIR elements that profiles constrain (`identifier`, `name`, `telecom`, `coding`, ...) are arrays. Where: `parentSchema` in [src/oas/profiles.ts](src/oas/profiles.ts). Fix: when walking the path, descend into `items` for array schemas.
- **#2 Operation parameter documentation is never used.** The code reads `description` from OperationDefinition parameters, but FHIR calls the field `documentation`. Custom operation query parameters never get descriptions, and the 200 response always says "Successful response". Where: `ParameterWithDescription`, `operationResponses` and `queryParameters` in [src/oas/operations.ts](src/oas/operations.ts).
- **#3 Operations that are both instance- and type-level produce an invalid spec.** Both paths share one operation object, so the type-level path (`/Type/$op`) also gets the `rid` path parameter, and both paths get the `-type` operationId. OpenAPI validation then fails (after the files are written). Where: `buildResourcePaths` in [src/oas/paths.ts](src/oas/paths.ts). Fix: build separate operation objects per path.
- **#4 Global header schemas are invalid OpenAPI 3.0.** Header parameters emit `type: 'string'` alongside `$ref`; in OpenAPI 3.0, siblings of `$ref` are ignored. Where: `headerParameters` in [src/oas/parameters.ts](src/oas/parameters.ts).
- **#5 Unknown SMART capability codes produce `undefined/...` scopes.** Any `capabilities` code other than `client-confidential-symmetric`, `permission-user` or `permission-patient` (for example `launch-standalone`) maps to `undefined`, which produces scopes like `undefined/Patient.r` on every operation. Where: `smartScopeBases` in [src/oas/security.ts](src/oas/security.ts). Fix: ignore codes that are not scope bases.
- **#6 Security is read from `rest[0]`, not the server `rest` entry.** Paths come from the `rest` entry with `mode: server`, but security comes from the first `rest` entry, whatever its mode. Where: `createContext` in [src/oas/context.ts](src/oas/context.ts).
- **#7 Contact URL may not be a URL.** The contact is chosen because it has a `url` telecom, but `info.contact.url` uses its first telecom, which could be an email or phone number. Where: `documentHeader` in [src/openApiGenerator.ts](src/openApiGenerator.ts).
- **#8 Update and patch request bodies say "to create".** The request body description is `<Type> to create` for create, update and patch. Where: `interactionRequestBody` in [src/oas/responses.ts](src/oas/responses.ts).
- **#9 The `system` tag is missing and the `metadata` tag has a broken link.** The top-level `tags` list only includes tags from resource-level operations, so `system` (used by `POST /` and system operations) is never listed. `metadata` is listed with a link to `https://www.hl7.org/fhir/metadata.html`, which is not a FHIR resource page (it's built as if `metadata` were a resource type). Where: tag collection in `buildPaths` ([src/oas/paths.ts](src/oas/paths.ts)) and tag building in `generateOpenApiSpec` ([src/openApiGenerator.ts](src/openApiGenerator.ts)).
- **#10 Bundle `request` is described as "A resource in the bundle."** This is a copy-paste error in the batch/transaction request schema. Where: `bundleRequestSchema` in [src/oas/fhirSchemas.ts](src/oas/fhirSchemas.ts).
- **#11 Examples are never attached for the core profile, and missing profiles get an `undefined-undefined` schema.** Examples are matched on the schema `description`, which is only the profile URL for profiles found in the IG. Examples that declare the core FHIR profile are never shown on base-profile resources. A profile listed in the CapabilityStatement but missing from the IG is still added to `components.schemas` under the key `undefined-undefined` (with only a warning). Where: `exampleRefs` in [src/oas/examples.ts](src/oas/examples.ts) and `resolveProfileSchemas` in [src/oas/profiles.ts](src/oas/profiles.ts).
- **#12 `patternCodeableConcept` only uses the first coding.** Other codings in the pattern are ignored. Where: `applyPattern` in [src/oas/profiles.ts](src/oas/profiles.ts).

## Crashes on unusual or malformed input

These throw a TypeError with no helpful message instead of reporting the problem.

- **#13 `max` on an element missing from the base schema.** A differential element with a numeric `max` (not `*` or `0`) on a path that is not in the base schema reads `.type` of undefined. Where: `applyCardinality` in [src/oas/profiles.ts](src/oas/profiles.ts).
- **#14 Pattern values where the parent schema has no `properties`.** `patternCodeableConcept` and `patternBoolean` assign into `parent.properties` without creating it (`patternCode` does create it). Where: `applyPattern` in [src/oas/profiles.ts](src/oas/profiles.ts).
- **#15 A resource with no `interaction` list.** It is assumed present. Where: `buildResourcePaths` in [src/oas/paths.ts](src/oas/paths.ts). Fix: treat it as empty.
- **#16 A search-parameter-combination extension without sub-extensions.** It is assumed to have `extension`. Where: `renderParameter` in [src/oas/parameters.ts](src/oas/parameters.ts).
- **#17 A CapabilityStatement with `meta` but no `meta.profile`.** Filtering CapabilityStatements reads `profile.includes` without a check. Where: `getFHIRArtifacts` in [src/ig/loadPackage.ts](src/ig/loadPackage.ts).
- **#18 No server-mode `rest` entry, or one with nothing in it.** The first throws an error. The second produces a document without `paths`, which then fails OpenAPI validation. Decide whether either should produce a valid empty spec. Where: `buildPaths` in [src/oas/paths.ts](src/oas/paths.ts).
- **#19 Failed package downloads are not detected.** The HTTP status of `--remoteUrl` and `--remoteDependencyUrl` downloads is not checked, so a 404 page is saved as the `.tgz` and the error surfaces later as a gzip failure. Where: `downloadPackages` in [src/ig/loadPackage.ts](src/ig/loadPackage.ts). Fix: check `response.ok` and report the URL and status.

## Tooling

- **#20 `yarn view` points at a file the tool never writes.** [server.js](server.js) serves `output/ExampleCapabilityStatement.openapi.json`, but the example IG produces `ExampleCapabilityStatementSMART` and `ExampleCapabilityStatementOauth`.

# Known issues

Bugs and quirks found while converting the converter to TypeScript. The conversion deliberately kept the existing behaviour so its output stays the same; these should be fixed as separate, reviewed changes. Each fix that changes the generated OpenAPI should be called out for downstream consumers.

Line references are to the TypeScript source on the `refactor` branch.

## Incorrect or incomplete output

These affect specs generated from valid input.

1. **Profile constraints on children of array elements are lost.** A differential rule on a child of an array-typed element (for example `Patient.identifier.system` with `min: 1` or a `patternCode`) is written to `properties`/`required` on the array schema itself instead of its `items`. OpenAPI ignores `properties` on an array schema, so the constraint has no effect. Most FHIR elements that profiles constrain (`identifier`, `name`, `telecom`, `coding`, ...) are arrays. Where: `parentSchema` in [src/oas/profiles.ts](src/oas/profiles.ts). Fix: when walking the path, descend into `items` for array schemas.
2. **Operation parameter documentation is never used.** The code reads `description` from OperationDefinition parameters, but FHIR calls the field `documentation`. Custom operation query parameters never get descriptions, and the 200 response always says "Successful response". Where: `LegacyParameter` in [src/oas/operations.ts:18](src/oas/operations.ts:18), used at lines 88 and 100.
3. **Operations that are both instance- and type-level produce an invalid spec.** Both paths share one operation object, so the type-level path (`/Type/$op`) also gets the `rid` path parameter, and both paths get the `-type` operationId. OpenAPI validation then fails (after the files are written). Where: [src/oas/paths.ts:345](src/oas/paths.ts:345). Fix: build separate operation objects per path.
4. **Global header schemas are invalid OpenAPI 3.0.** Header parameters emit `type: 'string'` alongside `$ref`; in OpenAPI 3.0, siblings of `$ref` are ignored. Where: `headerParameters` in [src/oas/parameters.ts:115](src/oas/parameters.ts:115).
5. **Unknown SMART capability codes produce `undefined/...` scopes.** Any `capabilities` code other than `client-confidential-symmetric`, `permission-user` or `permission-patient` (for example `launch-standalone`) maps to `undefined`, which produces scopes like `undefined/Patient.r` on every operation. Where: `smartScopeBases` in [src/oas/security.ts:75](src/oas/security.ts:75). Fix: ignore codes that are not scope bases.
6. **Security is read from `rest[0]`, not the server `rest` entry.** Paths come from the `rest` entry with `mode: server`, but security comes from the first `rest` entry, whatever its mode. Where: [src/oas/context.ts:48](src/oas/context.ts:48).
7. **Contact URL may not be a URL.** The contact is chosen because it has a `url` telecom, but `info.contact.url` uses its first telecom, which could be an email or phone number. Where: [src/openApiGenerator.ts:82](src/openApiGenerator.ts:82).
8. **Update and patch request bodies say "to create".** The request body description is `<Type> to create` for create, update and patch. Where: [src/oas/responses.ts:99](src/oas/responses.ts:99).
9. **The `system` tag is missing and the `metadata` tag has a broken link.** The top-level `tags` list only includes tags from resource-level operations, so `system` (used by `POST /` and system operations) is never listed. `metadata` is listed with a link to `https://www.hl7.org/fhir/metadata.html`, which is not a FHIR resource page (it's built as if `metadata` were a resource type). Where: tag collection in [src/oas/paths.ts:209](src/oas/paths.ts:209) and tag building in [src/openApiGenerator.ts:52](src/openApiGenerator.ts:52).
10. **Bundle `request` is described as "A resource in the bundle."** This is a copy-paste error in the batch/transaction request schema. Where: [src/oas/fhirSchemas.ts:35](src/oas/fhirSchemas.ts:35).
11. **Examples are never attached for the core profile, and missing profiles get an `undefined-undefined` schema.** Examples are matched on the schema `description`, which is only the profile URL for profiles found in the IG. Examples that declare the core FHIR profile are never shown on base-profile resources. A profile listed in the CapabilityStatement but missing from the IG is still added to `components.schemas` under the key `undefined-undefined` (with only a warning). Where: [src/oas/examples.ts:21](src/oas/examples.ts:21), [src/oas/profiles.ts:53](src/oas/profiles.ts:53).
12. **`patternCodeableConcept` only uses the first coding.** Other codings in the pattern are ignored. Where: [src/oas/profiles.ts:167](src/oas/profiles.ts:167).

## Crashes on unusual or malformed input

These throw a TypeError with no helpful message instead of reporting the problem.

13. **`max` on an element missing from the base schema.** A differential element with a numeric `max` (not `*` or `0`) on a path that is not in the base schema reads `.type` of undefined. Where: `applyCardinality` in [src/oas/profiles.ts:148](src/oas/profiles.ts:148).
14. **Pattern values where the parent schema has no `properties`.** `patternCodeableConcept` and `patternBoolean` assign into `parent.properties` without creating it (`patternCode` does create it). Where: [src/oas/profiles.ts:168](src/oas/profiles.ts:168) and line 187.
15. **A resource with no `interaction` list.** It is assumed present. Where: [src/oas/paths.ts:317](src/oas/paths.ts:317). Fix: treat it as empty.
16. **A search-parameter-combination extension without sub-extensions.** It is assumed to have `extension`. Where: [src/oas/parameters.ts:14](src/oas/parameters.ts:14).
17. **A CapabilityStatement with `meta` but no `meta.profile`.** Filtering CapabilityStatements reads `profile.includes` without a check. Where: [src/ig/loadPackage.ts:94](src/ig/loadPackage.ts:94).
18. **No server-mode `rest` entry, or one with nothing in it.** The first now throws a clear error (previously a TypeError). The second produces a document without `paths`, which then fails OpenAPI validation. Decide whether either should produce a valid empty spec. Where: [src/oas/paths.ts:194](src/oas/paths.ts:194).
19. **Failed package downloads are not detected.** The HTTP status of `--remoteUrl` and `--remoteDependencyUrl` downloads is not checked, so a 404 page is saved as the `.tgz` and the error surfaces later as a gzip failure. Where: [src/ig/loadPackage.ts:31](src/ig/loadPackage.ts:31). Fix: check `response.ok` and report the URL and status.

## Tooling

20. **`yarn view` points at a file the tool never writes.** [server.js](server.js) serves `output/ExampleCapabilityStatement.openapi.json`, but the example IG produces `ExampleCapabilityStatementSMART` and `ExampleCapabilityStatementOauth`.

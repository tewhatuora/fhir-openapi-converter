const OAS_SCHEMA_BASE_URL =
  'https://raw.githubusercontent.com/tewhatuora/schemas/main/alt-fhir-oas-flattened/';
const CAPABILITY_STATEMENT_URL =
  'https://fhir-ig.digital.health.nz/hnz-digital-tooling/StructureDefinition/hnz-capability-statement';
const CAPABILITY_STATEMENT_EXTENSIONS_URL =
  'https://fhir-ig.digital.health.nz/hnz-digital-tooling/StructureDefinition/resource-metadata-extension';
const MANDATORY_SEARCH_PARAM_EXTENSION_URL =
  'http://hl7.org/fhir/StructureDefinition/capabilitystatement-search-parameter-combination';
module.exports = {
  CAPABILITY_STATEMENT_EXTENSIONS_URL,
  CAPABILITY_STATEMENT_URL,
  OAS_SCHEMA_BASE_URL,
  MANDATORY_SEARCH_PARAM_EXTENSION_URL,
};

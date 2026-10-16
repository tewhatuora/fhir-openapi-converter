import type { OpenAPIV3 } from 'openapi-types';

export type CapabilityStatement = fhir4.CapabilityStatement;
export type RestResource = fhir4.CapabilityStatementRestResource;
export type RestInteraction = fhir4.CapabilityStatementRestInteraction;
export type RestOperation = fhir4.CapabilityStatementRestResourceOperation;
export type RestSecurity = fhir4.CapabilityStatementRestSecurity;
export type SearchParam = fhir4.CapabilityStatementRestResourceSearchParam;
export type Extension = fhir4.Extension;
export type StructureDefinition = fhir4.StructureDefinition;
export type ElementDefinition = fhir4.ElementDefinition;
export type OperationDefinition = fhir4.OperationDefinition;
export type OperationDefinitionParameter = fhir4.OperationDefinitionParameter;
export type FhirResource = fhir4.FhirResource;

/** Options accepted on the command line (see args.ts). */
export interface CliOptions {
  inputFolder?: string;
  remoteUrl?: string;
  remoteDependencyUrl?: string[];
  outputFolder: string;
  defaultOAuthScope?: string;
  dereferenceOutput: boolean;
  persistFiles: boolean;
  contentType: string[];
  defaultResponses: string;
  /** Skip writing output files (used by the tests). */
  disableOutputFiles?: boolean;
}

export interface GlobalHeader {
  value: string;
  required: boolean;
  documentation?: string;
}

export type ExampleRefs = Record<string, OpenAPIV3.ReferenceObject>;

export type InteractionType =
  | 'read'
  | 'vread'
  | 'create'
  | 'update'
  | 'patch'
  | 'delete'
  | 'search';

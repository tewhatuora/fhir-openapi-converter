import type {
  CapabilityStatement,
  FhirResource,
  OperationDefinition,
  StructureDefinition,
} from '../types';

/**
 * The FHIR resources of an Implementation Guide package, indexed for the
 * lookups the generator needs.
 */
export class IgIndex {
  readonly capabilityStatements: CapabilityStatement[] = [];
  private readonly structureDefinitions = new Map<
    string,
    StructureDefinition
  >();
  private readonly operationDefinitions = new Map<
    string,
    OperationDefinition
  >();
  /** Every resource that declares a profile, keyed by its first profile. */
  private readonly examplesByProfile = new Map<string, FhirResource[]>();

  static fromResources(resources: Iterable<unknown>): IgIndex {
    const index = new IgIndex();
    for (const resource of resources) index.add(resource);
    return index;
  }

  /** Adds a parsed JSON file; anything that is not a FHIR resource is ignored. */
  add(json: unknown): void {
    const resource = json as Partial<FhirResource> & { url?: string };
    if (resource?.resourceType === 'StructureDefinition') {
      this.structureDefinitions.set(
        resource.url!,
        resource as StructureDefinition
      );
    }
    if (resource?.resourceType === 'OperationDefinition') {
      this.operationDefinitions.set(
        resource.url!,
        resource as OperationDefinition
      );
    }
    if (resource?.resourceType === 'CapabilityStatement') {
      this.capabilityStatements.push(resource as CapabilityStatement);
    }
    const profile = resource?.meta?.profile?.[0];
    if (profile !== undefined) {
      const examples = this.examplesByProfile.get(profile) ?? [];
      examples.push(resource as FhirResource);
      this.examplesByProfile.set(profile, examples);
    }
  }

  structureDefinition(url: string): StructureDefinition | undefined {
    return this.structureDefinitions.get(url);
  }

  operationDefinition(url: string): OperationDefinition | undefined {
    return this.operationDefinitions.get(url);
  }

  examplesForProfile(profile: string): FhirResource[] {
    return this.examplesByProfile.get(profile) ?? [];
  }

  /** All resources that declare a profile, grouped by profile in load order. */
  allExamples(): FhirResource[] {
    return [...this.examplesByProfile.values()].flat();
  }
}

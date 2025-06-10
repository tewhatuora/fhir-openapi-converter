const {
  fetchBaseOasSchema,
  applyStructureDefinitionChanges,
} = require('../src/oas/profiles');
const { getStuctureDefinition } = require('./utils');

describe('FHIR StructureDefinition to OpenAPI features', () => {
  let baseSchema;
  beforeAll(async () => {
    baseSchema = await fetchBaseOasSchema('Patient');
  });

  describe('Item cardinality', () => {
    test('A StructureDefinition differential with a min < 0 should be marked as required in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.gender',
          path: 'Patient.gender',
          min: 1,
          patternCode: 'male',
        },
        'Patient'
      );

      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.required).toContain('gender');
    });

    test('A StructureDefinition differential with min and max should reflected in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.address',
          path: 'Patient.address',
          min: 2,
          max: '3',
        },
        'Patient'
      );

      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties.address.minItems).toEqual(2);
      expect(schema.properties.address.maxItems).toEqual(3);
      expect(schema.required).toContain('address');
    });

    test('A StructureDefinition differential with max of 0 should not be in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.birthDate',
          path: 'Patient.birthDate',
          max: '0',
        },
        'Patient'
      );
      // assert OpenAPI schema reflects the expected cardinality
      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties).not.toHaveProperty('birthDate');
      expect(schema.required).not.toContain('birthDate');
    });

    test('A StructureDefinition differential containing a patternBoolean of false should be reflected in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.active',
          path: 'Patient.active',
          patternBoolean: false,
        },
        'Patient'
      );
      // assert OpenAPI schema reflects the expected cardinality
      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties.active.enum).toEqual([false]);
    });

    test('A StructureDefinition differential containing a patternBoolean of true should be reflected in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.active',
          path: 'Patient.active',
          patternBoolean: true,
        },
        'Patient'
      );
      // assert OpenAPI schema reflects the expected cardinality
      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties.active.enum).toEqual([true]);
    });

    test('A StructureDefinition differential containing a patternCode should be reflected in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.gender',
          path: 'Patient.gender',
          min: 1,
          patternCode: 'male',
        },
        'Patient'
      );
      // assert OpenAPI schema reflects the expected cardinality
      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties.gender.enum).toEqual(['male']);
      expect(schema.required).toContain('gender');
    });

    test('A StructureDefinition differential containing a patternCodeableConcept should be reflected in the OpenAPI schema', async () => {
      const sd = getStuctureDefinition(
        {
          id: 'Patient.maritalStatus',
          path: 'Patient.maritalStatus',
          patternCodeableConcept: {
            coding: [
              {
                code: 'U',
                system:
                  'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
              },
            ],
          },
        },
        'Patient'
      );
      const schema = applyStructureDefinitionChanges(baseSchema, sd);
      expect(schema.properties.maritalStatus.properties.coding.items.properties.system.enum).toEqual([
        'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
      ]);
      expect(schema.properties.maritalStatus.properties.coding.items.properties.code.enum).toEqual([
        'U',
      ]);
      expect(schema.properties.maritalStatus.properties.coding.items.required).toEqual([
        'system',
        'code',
      ]);
    });
  });
});

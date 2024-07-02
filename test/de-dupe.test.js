const { deduplicateTopLevelProperties } = require('../src/de-dupe-schemas');

describe('deduplicateTopLevelProperties', () => {
  it('should replace duplicate top-level objects with $refs', () => {
    const schemas = {
      Patient: {
        properties: {
          name: {
            type: 'string',
            description: 'Name of the patient',
          },
          age: {
            type: 'integer',
            description: 'Age of the patient',
          },
        },
      },
      Doctor: {
        properties: {
          name: {
            type: 'string',
            description: 'Name of the patient',
          },
          specialty: {
            type: 'string',
            description: 'Specialty of the doctor',
          },
        },
      },
      Other: {
        properties: {
          name: {
            type: 'string',
            description: 'A non matching name',
          },
        },
      },
    };

    const dedupedSchemas = deduplicateTopLevelProperties(schemas);
    expect(dedupedSchemas.Patient.properties.name.$ref).toBeDefined();
    expect(dedupedSchemas.Doctor.properties.name.$ref).toBeDefined();
    // properties that are not duplicates should not be replaced
    expect(dedupedSchemas.Other.properties.name.$ref).not.toBeDefined();
  });
});

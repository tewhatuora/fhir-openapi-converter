const objectHash = require('object-hash');

const deduplicateTopLevelProperties = (schemas) => {
  const propertyHashCount = {};
  const hashToProperty = {};
  const hashToCanonicalPath = {};

  // First pass: Identify duplicates by counting occurrences of each property hash
  Object.keys(schemas).forEach((schemaKey) => {
    const schema = schemas[schemaKey];
    if (schema && schema.properties) {
      Object.keys(schema.properties).forEach((propertyKey) => {
        const property = schema.properties[propertyKey];
        const propertyHash = objectHash(property);

        // Count the occurrences of each hash
        if (propertyHashCount[propertyHash]) {
          propertyHashCount[propertyHash]++;
        } else {
          propertyHashCount[propertyHash] = 1;
          hashToProperty[propertyHash] = property; // Store the property against its hash
        }
      });
    }
  });

  // Second pass: Replace properties with references if they are duplicates
  Object.keys(schemas).forEach((schemaKey) => {
    const schema = schemas[schemaKey];
    if (schema && schema.properties) {
      Object.keys(schema.properties).forEach((propertyKey) => {
        const property = schema.properties[propertyKey];
        const propertyHash = objectHash(property);

        if (propertyHashCount[propertyHash] > 1) {
          // Check if this property is a duplicate
          const commonPropertyName = `${propertyKey}-${propertyHash}`;
          if (!hashToCanonicalPath[propertyHash]) {
            // Create a canonical reference path if it doesn't exist
            hashToCanonicalPath[propertyHash] =
              `#/components/schemas/${commonPropertyName}`;
            schemas = schemas || {};
            schemas[commonPropertyName] = hashToProperty[propertyHash];
          }
          schema.properties[propertyKey] = {
            $ref: hashToCanonicalPath[propertyHash],
          };
        }
      });
    }
  });

  return schemas;
};

module.exports = {
  deduplicateTopLevelProperties,
};

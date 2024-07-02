const debug = require('debug')('fhir-oasgen:profiles');
const { OAS_SCHEMA_BASE_URL } = require('../constants');

const generateOasSchemasFromProfiles = async (
  config,
  resourceType,
  baseProfile,
  supportedProfile = []
) => {
  const baseOasSchema = await fetchBaseOasSchema(resourceType);
  let defaultSchema;
  const allProfiles = [
    ...(baseProfile ? [baseProfile] : []),
    ...supportedProfile,
  ];

  if (allProfiles.length === 0) {
    allProfiles.push(`http://hl7.org/fhir/StructureDefinition/${resourceType}`);
  }

  const profilePromises = allProfiles.map(async (profile) => {
    if (profile === `http://hl7.org/fhir/StructureDefinition/${resourceType}`) {
      return {
        fhir: {
          resourceType: `Base-Profile`,
          id: resourceType,
        },
        oas: await fetchBaseOasSchema(resourceType),
      };
    }
    const structureDefinition = await getProfileOasSchema(
      config,
      resourceType,
      profile
    );
    return {
      fhir: structureDefinition,
      oas: applyStructureDefinitionChanges(baseOasSchema, structureDefinition),
    };
  });
  const resolvedProfiles = await Promise.all(profilePromises);
  return resolvedProfiles.length ? resolvedProfiles : [defaultSchema];
};

const fetchBaseOasSchema = async (type) => {
  debug(`Fetching Base OAS schema for ${type}`);
  const res = await fetch(`${OAS_SCHEMA_BASE_URL}${type}-definition.json`);
  return await res.json();
};

const getProfileOasSchema = async (config, resourceType, profile) => {
  return config.igFiles[profile];
};

const applyStructureDefinitionChanges = (schema, structureDefinition) => {
  let differential;
  if (structureDefinition?.differential) {
    differential = structureDefinition.differential;
  } else {
    return JSON.parse(JSON.stringify(schema));
  }

  const { element } = differential;
  const updatedSchema = JSON.parse(JSON.stringify(schema));
  updatedSchema.description = structureDefinition.url;

  element.forEach((element) => {
    if (element.id.includes(':')) {
      debug(`Ignoring element slice with id: ${element.id}`);
      return;
    }
    const jsonPath = element.path.replace(`${structureDefinition.type}.`, '');

    const pathParts = jsonPath.split('.');
    let currentSchema = updatedSchema;

    // Traverse down the schema object, initializing objects and `properties` as necessary
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentSchema.properties = currentSchema.properties || {};
      currentSchema.properties[pathParts[i]] = currentSchema.properties[
        pathParts[i]
      ] || { type: 'object', properties: {} };
      currentSchema = currentSchema.properties[pathParts[i]];
    }

    const lastPart = pathParts[pathParts.length - 1];
    // if a minimum cardinality is set, add the property to the `required` array
    if (element.min && element.min > 0) {
      currentSchema.required = currentSchema.required || [];
      if (!currentSchema.required.includes(lastPart)) {
        currentSchema.required.push(lastPart);
      }

      if (
        currentSchema.properties &&
        currentSchema.properties?.[lastPart]?.type === 'array'
      ) {
        currentSchema.properties[lastPart].minItems = Number(element.min);
      }
    }

    if (element.max && !['*', '0'].includes(element.max)) {
      if (currentSchema.properties[lastPart].type === 'array') {
        currentSchema.properties[lastPart].maxItems = Number(element.max);
      }
    }

    if (element.max && element.max === '0') {
      if (currentSchema.properties) {
        delete currentSchema.properties[lastPart];
        delete currentSchema.properties[`_${lastPart}`];
      }
    }

    if (element.hasOwnProperty('patternCodeableConcept')) {
      currentSchema.properties[lastPart] = {
        type: 'object',
        properties: {
          system: {
            type: 'string',
            enum: [element.patternCodeableConcept.coding[0].system],
          },
          code: {
            type: 'string',
            enum: [element.patternCodeableConcept.coding[0].code],
          },
        },
        required: ['system', 'code'],
      };
    }
    if (element.hasOwnProperty('patternBoolean')) {
      // Set fixed properties for the Boolean element
      currentSchema.properties[lastPart] = {
        type: 'boolean',
        enum: [element.patternBoolean],
      };
      // if a patternBoolean is set, it should also be a required field
      currentSchema.required = currentSchema.required || [];
      if (!currentSchema.required.includes(lastPart)) {
        currentSchema.required.push(lastPart);
      }
    }
    if (element.hasOwnProperty('patternCode')) {
      // Set fixed properties for the Code element
      currentSchema.properties = currentSchema.properties || {};
      currentSchema.properties[lastPart] = {
        type: 'string',
        enum: [element.patternCode],
      };
      // if a patternCode is set, it should also be a required field
      currentSchema.required = currentSchema.required || [];
      if (!currentSchema.required.includes(lastPart)) {
        currentSchema.required.push(lastPart);
      }
    }
  });
  return updatedSchema;
};

module.exports = {
  fetchBaseOasSchema,
  applyStructureDefinitionChanges,
  generateOasSchemasFromProfiles,
};

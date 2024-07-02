Instance: ExampleCapabilityStatement
InstanceOf: HnzToolingCapabilityStatement
Usage: #definition

* status =  #draft
* date = "2024-04-18"
* kind = #instance
* fhirVersion = #4.0.1
* version = "1.1.0"
* format = #json
* implementation.description = "Patient FHIR API"
* implementation.url = "https://example.digital.health.nz/fhir/R4"
* implementationGuide = "https://build.fhir.org/ig/tewhatuora/fhir-example"
* publisher = "Te Whatu Ora Health New Zealand"
* description = "FHIR API for Patients"
* rest.mode = #server

* contact.name = "Example Contact Details"
* contact.telecom.value = "https://example.com"
* contact.telecom.system = #url

* extension[HnzApiSpecBuilderExtension].extension[globalHeaders].extension[+].url = Canonical(HnzCustomHeadersExtension)
* extension[HnzApiSpecBuilderExtension].extension[globalHeaders].extension[=].extension[key].valueString = "Correlation-Id"
* extension[HnzApiSpecBuilderExtension].extension[globalHeaders].extension[=].extension[value].valueUri = "https://raw.githubusercontent.com/tewhatuora/schemas/main/fhir-definitions-oas/uuid-definition.json"
* extension[HnzApiSpecBuilderExtension].extension[globalHeaders].extension[=].extension[required].valueBoolean = true
* extension[HnzApiSpecBuilderExtension].extension[licenseURL].valueUri = "https://example.license.org"
* extension[HnzApiSpecBuilderExtension].extension[licenseName].valueString = "GPLv3"
* extension[HnzApiSpecBuilderExtension].extension[externalDocs].valueUri = "https://docs.example.com/fhir"

* rest.documentation = "Details the FHIR Server API for Patients. This API allows for the creation, retrieval and searching of Patient resources."
* rest.security.description = "Details security requirements are detailed at [security](./security.html)."
* rest.security.cors = false

* rest.security.service = #SMART-on-FHIR
* rest.security.extension[+].url = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
* rest.security.extension[=].extension[+].url = "token"
* rest.security.extension[=].extension[=].valueUri = "https://auth.example.com/oauth2/token"
* rest.security.extension[=].extension[+].url = "authorize"
* rest.security.extension[=].extension[=].valueUri = "https://auth.example.com/oauth2/authorize"
* rest.security.extension[+].url = "http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities"
* rest.security.extension[=].valueCode = #client-confidential-symmetric
* rest.security.extension[+].url = "http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities"
* rest.security.extension[=].valueCode = #permission-user
* rest.security.extension[+].url = "http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities"
* rest.security.extension[=].valueCode = #permission-patient

// system interactions
* rest.interaction[+].code = #transaction
* rest.interaction[+].code = #batch

// system custom operations
* rest.operation[+].name = "summary"
* rest.operation[=].definition = Canonical(ExampleSystemOperationDefinition)

// Patient resource
* rest.resource[+].type = #Patient
* rest.resource[=].operation[+].name = "summary"
* rest.resource[=].operation[=].definition = Canonical(ExampleQueryOperationDefinition)
* rest.resource[=].operation[+].name = "match"
* rest.resource[=].operation[=].definition = Canonical(ExampleOperationModeOperationDefinition)
* rest.resource[=].profile = Canonical(ExamplePatientProfile)
* rest.resource[=].supportedProfile[+] = Canonical(ExamplePatientProfile2)
* rest.resource[=].interaction[+].code = #read
* rest.resource[=].interaction[+].code = #search-type
* rest.resource[=].interaction[+].code = #create
* rest.resource[=].interaction[+].code = #update
* rest.resource[=].interaction[+].code = #delete
* rest.resource[=].versioning = #versioned
* rest.resource[=].searchParam[0].name = "general-practitioner"
* rest.resource[=].searchParam[=].definition = "http://hl7.org/fhir/SearchParameter/Patient-general-practitioner"
* rest.resource[=].searchParam[=].type = #reference
* rest.resource[=].searchParam[=].documentation = "Patient's nominated general practitioner, not the organization that manages the record"

// Encounter resource
* rest.resource[+].type = #Encounter
* rest.resource[=].profile = Canonical(Encounter)
* rest.resource[=].interaction[+].code = #read
* rest.resource[=].interaction[+].code = #vread

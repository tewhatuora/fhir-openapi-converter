Instance: ExampleQueryOperationDefinition
InstanceOf: OperationDefinition
Usage: #definition
* version = "0.1.0"
* name = "Patient summary"
* title = "Patient Summary"
* status = #draft
* kind = #query
* date = "2024-01-01T13:15:56.964-00:00"

* affectsState = false
* code = #summary
* resource = #Patient
* system = false
* type = true
* instance = false

* parameter[0].name = #identifier
* parameter[=].use = #in
* parameter[=].min = 1
* parameter[=].max = "1"
* parameter[=].documentation = "The NHI number of the patient for whom the summary is being requested. This should be provided with the NHI namespace (e.g. 'https://standards.digital.health.nz/ns/nhi-id|ZZZ0032)"
* parameter[=].type = #string
* parameter[=].searchType = #token
* parameter[+].name = #profile
* parameter[=].use = #in
* parameter[=].min = 1
* parameter[=].max = "1"
* parameter[=].documentation = "The profile for the patient summary being requested. For now, only a single profile is supported"
* parameter[=].type = #uri
* parameter[+].name = #graph
* parameter[=].use = #in
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].documentation = "Currently the summary operation does not require or support a graph definition. This parameter is included for future compatibility if needed."
* parameter[=].type = #uri
* parameter[+].name = #return
* parameter[=].use = #out
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].documentation = "The Bundle returned is a document conforming to the specified input profile parameter"
* parameter[=].type = #Bundle

// Define the Patient $match operation
Instance: ExampleOperationModeOperationDefinition
InstanceOf: OperationDefinition
Usage: #definition

* version = "0.1.0"
* name = "Patient Match"
* title = "Patient Match"
* kind = #operation
* date = "2024-01-01T13:15:56.964-00:00"
* status = #draft

* affectsState = false
* code = #match
* resource = #Patient
* system = false
* type = true
* instance = false

// Define the input parameters
* parameter[+].name = #identifier
* parameter[=].use = #in
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].type = #Identifier
* parameter[=].documentation = "A patient identifier to search for."

* parameter[+].name = #family
* parameter[=].use = #in
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].type = #string
* parameter[=].documentation = "A portion of the family name of the patient."

// Define the output parameter
* parameter[+].name = #return
* parameter[=].use = #out
* parameter[=].min = 1
* parameter[=].max = "1"
* parameter[=].type = #Bundle
* parameter[=].documentation = "The matching results as a Bundle of Patient resources."

Instance: ExampleSystemOperationDefinition
InstanceOf: OperationDefinition
Usage: #definition
* version = "0.1.0"
* name = "Patient summary - system"
* title = "Patient Summary - system"
* status = #draft
* kind = #query
* date = "2024-01-01T13:15:56.964-00:00"

* affectsState = false
* code = #summary
* resource = #Patient
* system = true
* type = false
* instance = false

* parameter[0].name = #identifier
* parameter[=].use = #in
* parameter[=].min = 1
* parameter[=].max = "1"
* parameter[=].documentation = "The NHI number of the patient for whom the summary is being requested. This should be provided with the NHI namespace (e.g. 'https://standards.digital.health.nz/ns/nhi-id|ZZZ0032)"
* parameter[=].type = #string
* parameter[=].searchType = #token
* parameter[+].name = #profile
* parameter[=].use = #in
* parameter[=].min = 1
* parameter[=].max = "1"
* parameter[=].documentation = "The profile for the patient summary being requested. For now, only a single profile is supported"
* parameter[=].type = #uri
* parameter[+].name = #graph
* parameter[=].use = #in
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].documentation = "Currently the summary operation does not require or support a graph definition. This parameter is included for future compatibility if needed."
* parameter[=].type = #uri
* parameter[+].name = #return
* parameter[=].use = #out
* parameter[=].min = 0
* parameter[=].max = "1"
* parameter[=].documentation = "The Bundle returned is a document conforming to the specified input profile parameter"
* parameter[=].type = #Bundle
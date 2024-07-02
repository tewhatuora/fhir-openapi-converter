Profile: ExamplePatientProfile
Parent: Patient
Id: example-patient
Title: "Example Patient Profile"

* gender 1..1 // to test required field
* active = true // to test patternBoolean
* birthDate 0..0 // to test not allowed elements
* address 2..3 // to test min/max cardinality of an array
* gender = #male // to test patternCode
* maritalStatus = http://terminology.hl7.org/CodeSystem/v3-MaritalStatus#U // to test patternCodeableConcept

Profile: ExamplePatientProfile2
Parent: Patient
Id: example-patient-2
Title: "Example Patient Profile 2"

* active = false // to test patternBoolean

Instance: ExamplePatientInstance
InstanceOf: ExamplePatientProfile
Usage: #example
* id = "example-patient-instance"
* gender = #male
* active = true
* address[+].line = "123 Example St"
* address[+].line = "456 Example St"

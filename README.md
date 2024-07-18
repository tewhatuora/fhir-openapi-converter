<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/tewhatuora/fhir-openapi-converter">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/img/two-dark-theme-logo.svg">
      <img alt="Health New Zealand Te Whatu Ora Logo" src="./assets/img/two.svg" width="50%">
    </picture>
  </a>

  <h3 align="center">Health New Zealand | Te Whatu Ora FHIR Implementation Guide to OpenAPI Converter</h3>

  <p align="center">
    This GitHub project is the source repository for the Health New Zealand Te Whatu Ora FHIR Implementation Guide to OpenAPI Converter project
    <br />
</div>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

1. Install the [Node.js runtime.](https://nodejs.org/en/download)

There are two ways to use this tool.

#### 1) Bundled release

The [Releases](https://github.com/tewhatuora/fhir-openapi-converter/releases) section of this repository contains a bundled JavaScript file which contains all dependencies. This file can be used alongside the usage instructions below without needing to install JavaScript dependencies or a package manager.

#### 2) Development build

A development build can be used, which can be helpful for debugging purposes. This method requires some additional steps.

1. Clone the repo
   ```sh
   git clone https://github.com/tewhatuora/fhir-openapi-converter.git
   ```
1. Install NPM packages using Yarn
   ```sh
   yarn install
   ```

#### Tool usage and overview

Review the [HNZ Digital Tooling IG](https://fhir-ig.digital.health.nz/hnz-digital-tooling) for more information on the supported features of this tool. This contains information on the prerequisites that an Implementation Guide **MUST** meet in order to use this tool.

### Usage Examples

```bash
./src/cli.js --inputFolder ./example-artifacts
./src/cli.js --remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz --remoteDependencyUrl https://fhir.org.nz/ig/base/package.tgz
```

The `LOG_LEVEL` environment variable can be used to set a log level for output written to the console. e.g. `LOG_LEVEL=debug ./src/cli.js --inputFolder ./example-artifacts`. The default settings is `info`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Configuration

The following table lists the configurable command line options for the Converter CLI. In most cases, the default configuration should be suitable.

| Option                | Alias | Type      | Description                                                                                                                                                                                                                                             | Default            |
| --------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `inputFolder`         | `i`   | `string`  | Local path to the FHIR Implementation Guide folder that contains built FSH artifacts. Example: `--inputFolder ./my-ig/fsh-generated`                                                                                                                    | None               |
| `outputFolder`        | `o`   | `string`  | Local path to write OpenAPI specifications. Example: `--outputFolder ./output`                                                                                                                                                                          | `./output`         |
| `remoteUrl`           | `u`   | `string`  | Remote URL to download the FHIR Implementation Guide package. Example: `--remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz`. When this option is used, a temporary folder is created on the OS to hold the downloaded files. | None               |
| `persistFiles`        | `p`   | `boolean` | Whether or not downloaded Implementation Guides should be persisted for debugging. Not applicable when inputFolder is used. Example: `--persistFiles true`                                                                                              |                    |
| `remoteDependencyUrl` | `d`   | `array`   | Url to retrieve a remote IG dependency                                                                                                                                                                                                                  |
| `contentType`         | `ct`  | `string`  | Content type of the API responses                                                                                                                                                                                                                       | `application/json` |
| `defaultResponses`    | `dt`  | `string`  | Comma separated string of response codes where an OperationOutcome is generated in the specification                                                                                                                                                    | 400,401,403,500    |
| `dereferenceOutput`   |       | `boolean` | Whether or not to fully deference the output specification                                                                                                                                                                                              | `true`             |
| `defaultOAuthScope`   |       | `string`  | When OAuth security is used (as opposed to SMART), this setting defined a single scope for ALL paths and operations                                                                                                                                     | none               |

The `inputFolder` option is mutually exclusive with the `remoteUrl` option. Only one of these should be provided at a time. Either `inputFolder` or `remoteUrl` must be provided.

#### Development

The `example-artifacts` directory contains an example, minimal Implementation Guide using FSH (FHIR Shorthand) files which contains an example CapabilityStatement used for development. When developing new features for this tool, updates should be made to this IG to test the feature.

To compile the FSH files in the `example-artifacts/input` folder, run `sushi example-artifacts`. This will update the output files in the `example-artifacts/fsh-generated` folder. To run the tool using these artifacts, run `./src/cli.js --inputFolder ./example-artifacts`

Once compiled, `yarn dev` can be used to run the tool in development.

To render the generated output in a Swagger UI, you can run `yarn view`. This will reload on changes to the output files.

## Releases

Prerelease command:

```
npm version prerelease
git push
git push --tags
```

## FAQ

**Q: The tool outputs the error, Error: No CapabilityStatements found matching https://fhir-ig.digital.health.nz/hnz-digital-tooling/StructureDefinition/hnz-capability-statement**

A: In order to use this tool, the IG CapabilityStatement must be an instance of the profile defined in [HNZ Digital Tooling IG](https://fhir-ig.digital.health.nz/hnz-digital-tooling/OpenAPI-Converter.html).

## License

This work is licensed under [CC BY-NC-ND 4.0](cc-by-nc-nd). Refer to the [LICENSE](./LICENSE) file for information.

[![CC BY 4.0][cc-by-nc-nd-image]](cc-by-nc-nd)

[cc-by-nc-nd]: https://creativecommons.org/licenses/by-nc-nd/4.0/
[cc-by-nc-nd-image]: https://i.creativecommons.org/l/by-nc-nd/4.0/80x15.png

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

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#configuration">Configuration</a></li>
      </ul>
    </li>
     <li><a href="#supported-features">Supported features</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

<!-- GETTING STARTED -->

## Getting Started

#### Installation

1. Install the [Node.js runtime.](https://nodejs.org/en/download)
2. Clone the repo
   ```sh
   git clone https://github.com/tewhatuora/fhir-openapi-converter.git
   ```
3. Install NPM packages using Yarn
   ```sh
   yarn install
   ```

#### Development

The `example-artifacts` directory contains some example FSH (FHIR Shorthand) files which contains example FHIR Profiles. When developing new features, specific FHIR features can be added to these files in order to develop against them.

To compile the FSH files in the `example-artifacts/input` folder, run `sushi example-artifacts`. This will update the output files in the `example-artifacts/fsh-generated` folder. To run the tool using these artifacts, run `./src/cli.js --inputFolder ./example-artifacts`

#### Configuration

The following table lists the configurable command line options for the Converter CLI:

| Option                | Alias | Type      | Description                                                                                                                                                                                                                                             | Default            |
| --------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `inputFolder`         | `i`   | `string`  | Local path to the FHIR Implementation Guide package folder. Example: `--inputFolder ./example-artifacts`                                                                                                                                                | None               |
| `outputFolder`        | `o`   | `string`  | Local path to write OpenAPI specifications. Example: `--outputFolder ./output`                                                                                                                                                                          | `./output`         |
| `remoteUrl`           | `u`   | `string`  | Remote URL to download the FHIR Implementation Guide package. Example: `--remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz`. When this option is used, a temporary folder is created on the OS to hold the downloaded files. | None               |
| `persistFiles`        | `p`   | `boolean` | Whether or not downloaded Implementation Guides should be persisted for debugging. Example: `--persistFiles true`                                                                                                                                       | `false`            |
| `dedupeSchemas`       | `dp`  | `boolean` | Whether or not to de-dedupe schemas to reduce spec size. Example: `--dedupeSchemas false`                                                                                                                                                               | `false`            |
| `remoteDependencyUrl` | `d`   | `array`   | Url to retrieve a remote IG dependency                                                                                                                                                                                                                  |
| `contentType`         | `ct`  | `string`  | Content type of the API responses                                                                                                                                                                                                                       | `application/json` |
| `defaultResponses`    | `dt`  | `string`  | Comma separated string of response codes where an OperationOutcome is returned                                                                                                                                                                          | `400,401,403,500   |

The `inputFolder` option is mutually exclusive with the `remoteUrl` option. Only one of these should be provided at a time. Either `inputFolder` or `remoteUrl` must be provided.

### Usage Examples

```bash
DEBUG=* ./src/cli.js --inputFolder ./example-artifacts
DEBUG=* ./src/cli.js --remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz --persistFiles true
DEBUG=* ./src/cli.js --remoteUrl https://build.fhir.org/ig/tewhatuora/fhir-auditevents/package.tgz --remoteDependencyUrl https://fhir.org.nz/ig/base/package.tgz
```

The `DEBUG=*` environment variable can be used for print verbose debug logs to the console. e.g. `DEBUG=* ./src/cli.js --inputFolder ./example-artifacts`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Tool usage and overview

Please review the [HNZ Digital Tooling IG](https://fhir-ig-uat.digital.health.nz/hnz-digital-tooling) for more information on the usage and supported features of this tool.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
<!-- LICENSE -->

## Releases
Prerelease command:

```
npm version prerelease
git push
git push --tags
```

## License

This work is licensed under [CC BY-NC-ND 4.0](cc-by-nc-nd). Refer to the [LICENSE](./LICENSE) file for information.

[![CC BY 4.0][cc-by-nc-nd-image]](cc-by-nc-nd)

[cc-by-nc-nd]: https://creativecommons.org/licenses/by-nc-nd/4.0/
[cc-by-nc-nd-image]: https://i.creativecommons.org/l/by-nc-nd/4.0/80x15.png

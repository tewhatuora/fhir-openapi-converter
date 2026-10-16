# IG regression harness

Runs two builds of the converter against a list of real Implementation Guides and reports how their output differs:

- **Baseline:** a published release's `cli.js`, downloaded from GitHub releases (the latest release by default).
- **Candidate:** the current checkout, built with its own `yarn build`.

Each build is treated as a black box and run as `node <cli.js> ...`, so this works the same for the JavaScript and TypeScript versions of the converter. Both builds see byte-identical network inputs (see [Network cache](#network-cache)), so any difference comes from the converter.

The generated OpenAPI is compared semantically. Each JSON and YAML file is parsed, object key order and YAML anchors/aliases are ignored, and array order is kept. The harness also compares exit codes, which files were written, and the warnings and errors each build logged.

Everything lives in this folder. Nothing here changes `src/`, the root `package.json` or the root `yarn.lock`.

## Running it

From the repository root:

```bash
yarn install                      # converter dependencies, needed for yarn build
(cd regression && yarn install)   # harness dependency (yaml)
node regression/run.mjs
```

The Markdown report is printed to stdout and written to `regression/out/report.md`, with a JSON summary in `regression/out/report.json`. Progress messages and build output go to stderr.

Exit codes: `0` when every IG matches, `1` when anything differs, `2` when the harness itself failed (for example a download error or a timeout).

Common options (`node regression/run.mjs --help` lists them all):

| Option                   | Effect                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--baseline <spec>`      | `latest` (default) is GitHub's latest release, which excludes prereleases. `newest` is the newest release including prereleases. You can also give a tag such as `v1.2.4-6`, or the path to a `cli.js`. |
| `--only shared-care,...` | Run only these IG ids.                                                                                                                                                                                  |
| `--offline`              | Fail any request that isn't already cached instead of fetching it.                                                                                                                                      |
| `--refresh`              | Delete the cached network inputs first, so everything is fetched again.                                                                                                                                 |
| `--skip-build`           | Use an existing candidate `cli.js` instead of running `yarn build`. Point it at another file with `--candidate-cli <path>`.                                                                             |

Release lookups use the public github.com URLs, so neither `gh` nor a token is needed. `--baseline newest` uses the GitHub API; set `GITHUB_TOKEN` if you hit its rate limit.

## Adding IGs

Add an entry to [`igs.yaml`](igs.yaml):

```yaml
igs:
  - id: my-ig # letters, digits, ".", "_" or "-"; used in the report and folder names
    description: Optional text shown in the report
    packageUrl: https://example.org/fhir/my-ig/package.tgz # or inputFolder: path/from/repo/root
    dependencyUrls: # optional, packageUrl only
      - https://fhir.org.nz/ig/base/package.tgz
    options: # any other converter option
      defaultOAuthScope: scope/my-ig
      contentType: [application/json, application/fhir+json] # a list repeats the flag
      dereferenceOutput: false
```

`skip: true` keeps an entry in the file without running it. The harness sets `--inputFolder`, `--remoteUrl`, `--remoteDependencyUrl` and `--outputFolder` itself, so put the source at the top level of the entry rather than under `options`.

## Network cache

The converter downloads the IG packages and fetches base FHIR schemas from raw.githubusercontent.com (the `main` branch of tewhatuora/schemas). Dereferencing and validation also resolve remote `$ref`s. If either build fetched these live, an upstream change between the two runs would show up as a converter difference.

To avoid this, the harness:

1. downloads each IG package (and its dependencies) once, before either build runs;
2. preloads [`lib/fetch-cache.cjs`](lib/fetch-cache.cjs) into both builds with `node -r`. The shim serves every HTTP GET from `regression/.cache/http/`, covering global `fetch` and `http.get`/`https.get`. A cache miss is fetched once and stored, so the candidate gets exactly what the baseline got.

The cache persists between local runs, so repeated runs compare against the same inputs. Error responses such as a 404 are cached too, because they are part of the input. Network failures are not cached. Each entry is a `<sha256 of URL>.body` file plus a `.json` file holding the URL, status, size and fetch time.

To pick up new upstream content (a republished IG or updated base schemas), refresh the cache:

```bash
node regression/run.mjs --refresh     # or: rm -rf regression/.cache/http
```

Downloaded release bundles are kept as `regression/.cache/releases/<tag>/cli.js.release`. The extension stops the root `yarn lint` from linting them; Node runs the file the same way. Release assets don't normally change, but deleting that folder forces a fresh download.

The report shows, for each build, how many requests were served from the cache or fetched. It also warns when the candidate requested URLs the baseline never asked for. Use `--offline` to prove a run made no live requests.

## Reading the report

The report starts with a summary table, one row per IG. A details section per IG follows, with:

- exit code, number of files written, warning/error count, network requests and duration for each build;
- files only one build wrote;
- warning/error lines only one build logged. These are winston `warn:`/`error:` lines plus stderr without stack frames. Timestamps, PIDs, temporary paths and output paths are normalised;
- one section per CapabilityStatement (from the `<id>.openapi.json|yaml` file names). Each lists the JSON paths that were `added`, `removed` or `changed`, with baseline and candidate values truncated to about 160 characters. When the YAML file has the same differences as the JSON file, the report says so once instead of repeating the table.

Arrays are aligned before comparing, so an inserted parameter shows up as one `added` entry, not as a change at every later index. The Markdown lists at most 40 differences per file. `report.json` has up to 500 per file, with longer values, and the exact count is always given. For anything more, the full output of both builds is in `regression/out/runs/<ig>/<baseline|candidate>/`, alongside `stdout.log`, `stderr.log`, `network.jsonl` and the exact `command.txt`.

## CI

[`.github/workflows/regression.yaml`](../.github/workflows/regression.yaml) runs on pull requests and on manual dispatch. You can choose the baseline and a subset of IGs when you trigger it by hand. The job fails when anything differs, appends the report to the job summary and uploads `regression/out/` as the `regression-report` artifact. In CI the network cache starts empty on every run; the two builds in that run still share it.

A pull request that changes output on purpose (a bug fix) will fail this job. Read the report to confirm the differences are the intended ones.

## Tests

```bash
cd regression && yarn test
```

These cover the diff (key order, YAML aliases, array alignment) and the shim (record, replay, offline) against a local HTTP server.

## Limitations

- The shim intercepts global `fetch` and `http`/`https.get`. If the converter switches to another HTTP client (such as undici's `request`, or axios with its own agent), extend the shim. `--offline` on a warm cache will reveal requests the shim misses: they fail instead of silently going live.
- Messages are compared as a multiset of normalised lines, so the order they were logged in is ignored. Lines below `warn` level are not compared. Set `LOG_LEVEL` to change what the converter prints, not what is compared.
- The root ESLint config has no global ignore list, so the root `yarn lint` also lints this folder. The committed files pass the root ESLint and Prettier rules, and nothing the harness writes is a `.js` file. If you add scripts here, run `yarn lint` from the root.

# Paint By

A modernised browser-based paint-by-numbers generator.

This project converts source images into simplified paint-by-number artwork by
reducing colour complexity, segmenting image regions, tracing region boundaries,
placing labels, and producing printable or exportable outputs.

## Origin and Attribution

This project is derived from the excellent **Paint by Numbers Generator**
created by **drake7707**.

Original project:

https://github.com/drake7707/paintbynumbersgenerator

The original repository provided the core browser-based paint-by-numbers
generation approach, including image segmentation, colour reduction, facet
management, border tracing, and label placement logic.

This repository is a modernised continuation of that work. It preserves and
evolves the original algorithmic foundation while introducing repository
cleanup, architectural refactoring, dependency updates, UI improvements, worker-
based processing, and ongoing maintainability improvements.

Many thanks to the original author for releasing the project under the MIT
License.

## Project Goals

- Provide a clean browser-based paint-by-numbers workflow.
- Modernise the application structure around React, Vite, and TypeScript.
- Keep expensive image-processing work away from the main UI thread where
  practical.
- Improve maintainability, readability, and future extensibility.
- Preserve the useful algorithmic foundation of the original project.
- Support ongoing improvements to palette generation, segmentation, export, and
  printable output workflows.

## Current Status

This repository is an active clean build and modernisation effort. Some legacy
source files may remain while the codebase is progressively consolidated.

The current direction is to keep the project usable while reducing duplicate
implementations, isolating the core paint-by-numbers engine, and improving the
frontend experience.

## Maintainer Notes

The deployed web app is the Vite/React application under `client/src`.
`client/src/lib/pbn-engine` is the engine copy used by the browser worker.

The root-level legacy files (`index.html`, `index_v2.html`, `src`, `src-cli`,
`styles`, and `scripts`) are retained for reference while the modern app is
consolidated. Prefer changing the `client/src` app and worker-backed engine for
end-user improvements unless a task explicitly targets the legacy UI or CLI.

## Development

Install dependencies:

```bash
pnpm install
```

Run locally:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Typecheck:

```bash
pnpm check
```

## License

This project is released under the MIT License.

The license notice preserves attribution to the original author and includes
copyright for subsequent modifications in this repository. See [LICENSE](LICENSE)
for details.

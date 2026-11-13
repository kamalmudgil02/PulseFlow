

# PulseFlow

PulseFlow is an advanced distributed job processing platform.

## Technology Stack

- Next.js

- NestJS

- TypeScript

- PostgreSQL

- Prisma

- Redis

- BullMQ

- [Socket.IO](http://Socket.IO)

- Docker

- OpenTelemetry

## Architecture

Modular monolith with independently deployable API and worker processes.

## Project Status

Currently in the product planning and engineering setup stage.

## Runtime

Node.js 26.13.1 is the pinned runtime. It is the Active LTS line, codename Lithium. That line became Active LTS on 28 October 2026, and 26.13.1 is the 11 November 2026 security release. Support continues through April 2029.

NestJS recommends the latest Active LTS. Next.js accepts Node.js 20.9 and newer. Prisma ORM 7.10.1 declares `node: ^20.19 || ^22.12 || >=24.0`, which includes Node.js 26. The pin is recorded in `.nvmrc` and in the root `package.json` `engines` field. The package manager is pnpm 12.18.0.

Node.js 24 is Maintenance LTS, so it is not the runtime for new work. Node.js 27 is Alpha and is not used.

Prisma ORM 7.10.1 and `@prisma/client` 7.10.1 are the selected database packages. They will be pinned when the database package is added. Prisma ORM 8 is a release candidate and replaces the `schema.prisma` and Prisma Migrate workflow, so it is not used.

## Development

The repository currently contains the root workspace skeleton. Application packages, Prisma, and Docker Compose are not set up yet.

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
```

## Documentation

- Product requirements: docs/product/

- System architecture: docs/architecture/

- Database design: docs/database/

- Architecture decisions: docs/adr/
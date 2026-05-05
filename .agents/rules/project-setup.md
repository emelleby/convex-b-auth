This project uses bun as the bundler and runtime. Make sure to use bun instead of node or npm.

## Tech Stack Overview

This project is built with a modern, type-safe full-stack architecture:

- **Tanstack Start**: A React framework built on Vite with file-based routing, server-side rendering, and powerful data fetching capabilities. Provides excellent developer experience with hot module replacement and TypeScript support.

- **Convex**: A backend-as-a-service platform that provides a real-time database, serverless functions, and authentication. The project uses the Convex adapter for Better Auth, enabling seamless integration with the auth system.

- **Better Auth**: A comprehensive authentication library that handles user authentication, session management, and organization/team management. Integrated with Convex through the `@convex-dev/better-auth` adapter.

- **shadcn/ui**: A collection of reusable, accessible UI components built on Radix UI primitives and styled with Tailwind CSS.

- **Biome**: A fast, modern formatter and linter that replaces ESLint and Prettier.

- **i18n**: Internationalization support using Paraglide JS for multi-language support (English, Norwegian, German).

## Installation

```bash
bun install
```

## Code Formatting & Linting

This project uses Biome for code formatting and linting. Biome is configured in [`biome.json`](biome.json:1) with the following settings:

- **Formatter**: Tab indentation, single quotes, semicolons as needed, no trailing commas
- **Linter**: Recommended rules enabled
- **Auto-import organization**: Enabled

```bash
# Format code
bun run format

# Lint code
bun run lint

# Run both format and lint checks
bun run check

# Auto-fix issues
bun run check --write
```

## Running the app

```bash
# development
bun run start

# watch mode
bun run start:dev

# production mode
bun run start:prod
```

## Test

```bash
# unit tests
bun run test

# e2e tests
bun run test:e2e

# test coverage
bun run test:cov
```

## Build & Deploy

```bash
# Build for production
bun run build

# Deploy to Cloudflare Workers
bun run deploy
```

## Storybook

```bash
# Start Storybook development server
bun run storybook

# Build Storybook for production
bun run build-storybook
```
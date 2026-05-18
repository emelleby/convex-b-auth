# Convex Better Auth Starter

A modern, type-safe full-stack starter built with [TanStack Start](https://tanstack.com/start), [Convex](https://convex.dev/), and [Better Auth](https://www.better-auth.com/).

## 🚀 Key Features

- **Full-stack React**: Powered by TanStack Start (SSR, Streaming, Server Functions).
- **Backend as a Service**: [Convex](https://convex.dev/) for real-time database, file storage, and serverless functions.
- **Authentication**: Fully integrated [Better Auth](https://www.better-auth.com/) with a native Convex adapter.
- **Organization & Team Management**: Multi-tenant support with organizations and teams out of the box.
- **Internationalization**: [ParaglideJS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for type-safe i18n and localized routing.
- **Type-safe Form Handling**: `useAppForm` pattern built on TanStack Form.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components.
- **Tooling**: [Biome](https://biomejs.dev/) for ultra-fast linting and formatting.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TanStack Router, TanStack Start |
| **Database** | Convex (Real-time, Document-based) |
| **Auth** | Better Auth + Convex Adapter |
| **I18n** | ParaglideJS + Inlang |
| **Forms** | TanStack Form + Zod |
| **Styling** | Tailwind CSS v4, Lucide React, Radix UI |
| **Runtime** | Bun |
| **Package Manager** | Bun |

## 🏁 Getting Started

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh/) installed.

### 2. Installation
```bash
bun install
```

### 3. Configure Convex
```bash
# Initialize Convex (creates .env.local)
bunx convex dev
```

### 4. Run Development Server
```bash
bun dev
```

## 🏗 Project Structure

- `convex/`: Convex backend schema, mutations, and queries.
  - `betterAuth/`: The authentication component and adapter.
- `src/`: TanStack Start frontend application.
  - `routes/`: File-based routing (TanStack Router).
  - `components/`: UI components (including `ui/` from shadcn).
  - `lib/`: Auth clients and utility functions.
  - `paraglide/`: Generated i18n runtime.

## 🧬 Demo Capabilities

Explore the `src/routes/demo/` directory to see examples of the stack in action:

- **Auth** (`/demo/auth`): Sign up, sign in, and organization switching.
- **Convex** (`/demo/convex`): Real-time data fetching and mutations.
- **Forms** (`/demo/form.simple`, `/demo/form.address`): Type-safe forms with validation.
- **i18n** (`/demo/i18n`): Localized strings and routing.
- **Table** (`/demo/table`): Data table implementation with shadcn.
- **TanStack Query** (`/demo/tanstack-query`): Server-state management.

## 🔒 Authentication & Authorization

This project uses **Better Auth** with the **Organization Plugin**. 

- **Client-side**: Use `authClient` from `src/lib/auth-client.ts`.
- **Server-side**: Use `auth` from `src/lib/auth-server.ts` or `ctx.runQuery(components.betterAuth.adapter.getSession, ...)` in Convex.
- **Middleware**: Protected routes are defined in `src/routes/_authed`.

## 🌍 Localization (i18n)

- Messages live in `project.inlang/`.
- Run the dev server to regenerate `src/paraglide`.
- URLs are automatically localized (e.g., `/en/about`, `/no/about`).

## 🧪 Testing

```bash
bun test
```

## 🧹 Linting & Formatting

```bash
bun lint   # Check for issues
bun format # Fix formatting
```

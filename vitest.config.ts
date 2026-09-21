import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Vitest resolves this file in preference to vite.config.ts. That is deliberate:
// the app config loads the Cloudflare plugin, whose workers environment fails
// during test collection with
//   "[module runner] Dynamic access of `import.meta.env` is not supported".
// Tests need none of the app's build pipeline, so they get their own config.
//
// Two projects, because the two suites need different environments:
//   convex — edge-runtime, matching the Convex function runtime (convex-test)
//   web    — jsdom + React, for component tests
export default defineConfig({
	test: {
		projects: [
			{
				plugins: [tsconfigPaths()],
				test: {
					name: 'convex',
					environment: 'edge-runtime',
					include: ['convex/**/*.test.ts'],
					server: {
						deps: {
							inline: ['convex-test'],
						},
					},
				},
			},
			{
				plugins: [tsconfigPaths(), viteReact()],
				test: {
					name: 'web',
					environment: 'jsdom',
					include: ['src/**/*.test.{ts,tsx}'],
				},
			},
		],
		// .kilo holds stale git worktrees containing copies of these same test
		// files; without this they get collected twice.
		exclude: ['**/node_modules/**', '**/dist/**', '.kilo/**'],
	},
})

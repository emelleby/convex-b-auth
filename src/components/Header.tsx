import { useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import AuthButton from './AuthButton'
import ParaglideLocaleSwitcher from './LocaleSwitcher.tsx'
import ThemeToggle from './ThemeToggle'

export default function Header() {
	const detailsRef = useRef<HTMLDetailsElement>(null)

	useEffect(() => {
		const details = detailsRef.current
		if (!details) return

		const handleClickOutside = (e: MouseEvent) => {
			if (details.open && !details.contains(e.target as Node)) {
				details.open = false
			}
		}

		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	}, [])

	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
					>
						<span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
						TanStack Start
					</Link>
				</h2>

				<div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
					<ParaglideLocaleSwitcher />
					<ThemeToggle />
					<AuthButton />
				</div>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: 'nav-link is-active' }}
					>
						Home
					</Link>
					<Link
						to="/about"
						className="nav-link"
						activeProps={{ className: 'nav-link is-active' }}
					>
						About
					</Link>
					<a
						href="https://tanstack.com/start/latest/docs/framework/react/overview"
						className="nav-link"
						target="_blank"
						rel="noreferrer"
					>
						Docs
					</a>
					<details
						ref={detailsRef}
						className="relative w-full sm:w-auto"
						onClick={(e) => {
							if ((e.target as HTMLElement).closest('a') && detailsRef.current) {
								detailsRef.current.open = false
							}
						}}
					>
						<summary className="nav-link list-none cursor-pointer">
							Demos
						</summary>
						<div className="mt-2 min-w-56 rounded-xl border border-[var(--line)] bg-[var(--header-bg)] p-2 shadow-lg sm:absolute sm:right-0"
						>
							<Link
								to="/demo/form/simple"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Simple Form
							</Link>
							<Link
								to="/demo/form/address"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Address Form
							</Link>
							<Link
								to="/demo/table"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								TanStack Table
							</Link>
							<Link
								to="/demo/store"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Store
							</Link>
							<Link
								to="/demo/tanstack-query"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								TanStack Query
							</Link>
							<Link
								to="/demo/convex"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Convex
							</Link>
							<Link
								to="/demo/auth"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Auth Demo
							</Link>
							<Link
								to="/demo/orpc-todo"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								oRPC Todo
							</Link>
							<Link
								to="/demo/i18n"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								I18n example
							</Link>
							<Link
								to="/demo/storybook"
								className="block rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
							>
								Storybook
							</Link>
						</div>
					</details>
				</div>
			</nav>
		</header>
	)
}

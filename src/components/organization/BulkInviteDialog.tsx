'use client'

import { useQuery } from '@tanstack/react-query'
import { useQuery as useConvexQuery, useMutation } from 'convex/react'
import { Upload, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { authClient } from '@/lib/auth-client'
import { api } from '../../../convex/_generated/api'

type ParsedRow = {
	email: string
	name?: string
	role: 'member' | 'admin' | 'owner'
	teamName?: string
	valid: boolean
	error?: string
}

type InviteResult = {
	email: string
	success: boolean
	error?: string
}

const VALID_ROLES = ['member', 'admin', 'owner'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function detectDelimiter(firstLine: string): ',' | ';' {
	return firstLine.includes(';') ? ';' : ','
}

function parseCSV(raw: string): ParsedRow[] {
	const lines = raw
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)
	if (!lines.length) return []

	const delimiter = detectDelimiter(lines[0])

	let start = 0
	const firstCell = lines[0].split(delimiter)[0].trim().toLowerCase()
	if (firstCell === 'email') start = 1

	return lines.slice(start).map((line) => {
		const [emailRaw = '', nameRaw = '', roleRaw = '', teamRaw = ''] = line
			.split(delimiter)
			.map((s) => s.trim())
		const email = emailRaw.toLowerCase()
		const name = nameRaw || undefined
		const roleLower = roleRaw.toLowerCase()
		const role = (VALID_ROLES as readonly string[]).includes(roleLower)
			? (roleLower as 'member' | 'admin' | 'owner')
			: 'member'
		const teamName = teamRaw || undefined

		if (!email)
			return {
				email,
				name,
				role,
				teamName,
				valid: false,
				error: 'Email is required'
			}
		if (!EMAIL_RE.test(email))
			return {
				email,
				name,
				role,
				teamName,
				valid: false,
				error: 'Invalid email format'
			}
		return { email, name, role, teamName, valid: true }
	})
}

export default function BulkInviteDialog() {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<'input' | 'preview' | 'results'>('input')
	const [csvText, setCsvText] = useState('')
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
	const [results, setResults] = useState<InviteResult[]>([])
	const [submitting, setSubmitting] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const { data: activeOrg } = authClient.useActiveOrganization()
	const orgSettings = useConvexQuery(
		api.orgSettings.getSettings,
		activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)
	const patchInvitationExpiry = useMutation(
		api.orgSettings.patchInvitationExpiry
	)

	const { data: teamsResponse } = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: () =>
			authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			}),
		enabled: !!activeOrg?.id
	})

	// Build a case-insensitive name → id map for quick lookup at submit time
	const teamNameToId = new Map<string, string>(
		(teamsResponse?.data ?? []).map((t: { id: string; name: string }) => [
			t.name.toLowerCase(),
			t.id
		])
	)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? '')
		reader.readAsText(file)
	}

	const handlePreview = () => {
		setParsedRows(parseCSV(csvText))
		setStep('preview')
	}

	const handleSubmit = async () => {
		const validRows = parsedRows.filter((r) => r.valid)
		setSubmitting(true)
		const inviteResults: InviteResult[] = []
		const validityDays = orgSettings?.invitationValidityDays ?? 365

		for (const row of validRows) {
			try {
				const teamId = row.teamName
					? teamNameToId.get(row.teamName.toLowerCase())
					: undefined
				const res = await authClient.organization.inviteMember({
					email: row.email,
					role: row.role,
					...(teamId ? { teamId } : {})
				})
				if (res?.error) {
					inviteResults.push({
						email: row.email,
						success: false,
						error: res.error.message ?? 'Failed'
					})
					continue
				}
				const invitationId =
					res && typeof res === 'object' && 'data' in res
						? (res as { data?: { id?: string } }).data?.id
						: undefined
				if (invitationId && validityDays !== 2) {
					const expiresAt = Date.now() + validityDays * 24 * 60 * 60 * 1000
					try {
						await patchInvitationExpiry({ invitationId, expiresAt })
					} catch {
						/* non-critical */
					}
				}
				inviteResults.push({ email: row.email, success: true })
			} catch (err) {
				inviteResults.push({
					email: row.email,
					success: false,
					error: err instanceof Error ? err.message : 'Unknown error'
				})
			}
		}

		setResults(inviteResults)
		setSubmitting(false)
		setStep('results')
		const sent = inviteResults.filter((r) => r.success).length
		const failed = inviteResults.filter((r) => !r.success).length
		if (failed === 0) {
			toast.success(
				`${sent} invitation${sent !== 1 ? 's' : ''} sent successfully!`
			)
		} else {
			toast.warning(`${sent} sent, ${failed} failed`)
		}
	}

	const handleClose = () => {
		setOpen(false)
		setTimeout(() => {
			setStep('input')
			setCsvText('')
			setParsedRows([])
			setResults([])
		}, 200)
	}

	const validCount = parsedRows.filter((r) => r.valid).length
	const sentCount = results.filter((r) => r.success).length
	const failedResults = results.filter((r) => !r.success)

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) handleClose()
				else setOpen(true)
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Users className="h-4 w-4 mr-2" />
					Bulk Invite
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				{step === 'input' && (
					<>
						<DialogHeader>
							<DialogTitle>Bulk Invite Members</DialogTitle>
							<DialogDescription>
								Paste CSV or upload a file. Format:{' '}
								<code>email,name,role,team</code> — name, role, and team are
								optional. Role defaults to member. Team must match an existing
								team name exactly.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<Textarea
								placeholder={
									'email,name,role,team\nalice@example.com,Alice Smith,member,Engineering\nbob@example.com,,admin\ncarol@example.com'
								}
								value={csvText}
								onChange={(e) => setCsvText(e.target.value)}
								rows={8}
								className="font-mono text-sm"
							/>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload CSV
								</Button>
								<input
									ref={fileInputRef}
									type="file"
									accept=".csv"
									className="hidden"
									onChange={handleFileChange}
								/>
								<span className="text-sm text-muted-foreground">
									or paste directly above
								</span>
							</div>
						</div>
						<DialogFooter>
							<Button variant="ghost" onClick={handleClose}>
								Cancel
							</Button>
							<Button onClick={handlePreview} disabled={!csvText.trim()}>
								Preview
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 'preview' && (
					<>
						<DialogHeader>
							<DialogTitle>Preview Invitations</DialogTitle>
							<DialogDescription>
								{validCount} valid invitation{validCount !== 1 ? 's' : ''} ready
								to send.
								{parsedRows.length - validCount > 0 &&
									` ${parsedRows.length - validCount} row(s) with errors will be skipped.`}
							</DialogDescription>
						</DialogHeader>
						<div className="py-4 max-h-80 overflow-y-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="pb-2 pr-4 font-medium">Email</th>
										<th className="pb-2 pr-4 font-medium">Name</th>
										<th className="pb-2 pr-4 font-medium">Role</th>
										<th className="pb-2 pr-4 font-medium">Team</th>
										<th className="pb-2 font-medium">Status</th>
									</tr>
								</thead>
								<tbody>
									{parsedRows.map((row) => (
										<tr
											key={row.email || Math.random()}
											className={row.valid ? '' : 'text-destructive'}
										>
											<td className="py-1 pr-4">
												{row.email || <em>(empty)</em>}
											</td>
											<td className="py-1 pr-4">{row.name ?? '—'}</td>
											<td className="py-1 pr-4">{row.role}</td>
											<td className="py-1 pr-4">
												{row.teamName ? (
													teamNameToId.has(row.teamName.toLowerCase()) ? (
														row.teamName
													) : (
														<span className="text-amber-600">
															{row.teamName} (not found)
														</span>
													)
												) : (
													'—'
												)}
											</td>
											<td className="py-1">
												{row.valid ? '✓ Valid' : row.error}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<DialogFooter>
							<Button variant="ghost" onClick={() => setStep('input')}>
								Back
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={validCount === 0 || submitting}
							>
								{submitting
									? 'Sending…'
									: `Send ${validCount} invitation${validCount !== 1 ? 's' : ''}`}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 'results' && (
					<>
						<DialogHeader>
							<DialogTitle>Invitations Sent</DialogTitle>
							<DialogDescription>
								{sentCount} sent successfully
								{failedResults.length > 0
									? `, ${failedResults.length} failed`
									: ''}
								.
							</DialogDescription>
						</DialogHeader>
						{failedResults.length > 0 && (
							<div className="py-4 max-h-60 overflow-y-auto space-y-1">
								<p className="text-sm font-medium text-destructive">Failed:</p>
								{failedResults.map((r) => (
									<div key={r.email} className="text-sm text-destructive">
										{r.email} — {r.error}
									</div>
								))}
							</div>
						)}
						<DialogFooter>
							<Button onClick={handleClose}>Done</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}

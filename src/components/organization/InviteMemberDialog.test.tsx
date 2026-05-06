// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { authClient } from '@/lib/auth-client'

type MockFormValues = Record<string, string>

type MockSafeParseResult =
	| { success: true; data: MockFormValues }
	| {
			success: false
			error: {
				flatten: () => {
					fieldErrors: Record<string, string[] | undefined>
				}
			}
	  }

interface MockUseAppFormOptions {
	defaultValues: MockFormValues
	validators?: {
		onDynamic?: {
			safeParse?: (values: MockFormValues) => MockSafeParseResult
		}
		onSubmit?: {
			safeParse?: (values: MockFormValues) => MockSafeParseResult
		}
	}
	onSubmit: ({ value }: { value: MockFormValues }) => Promise<void> | void
	onSubmitInvalid?: (payload: {
		formApi: {
			state: {
				fieldMeta: Record<string, { errors: Array<{ message: string }> }>
			}
		}
	}) => void
}

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
	toastSuccessMock: vi.fn(),
	toastErrorMock: vi.fn()
}))

vi.mock('sonner', () => ({
	toast: {
		success: toastSuccessMock,
		error: toastErrorMock
	}
}))

vi.mock('@/lib/auth-client', () => {
	return {
		authClient: {
			useActiveOrganization: () => ({
				data: { id: 'org-1', name: 'Test Org' }
			}),
			organization: {
				inviteMember: vi.fn().mockResolvedValue(undefined),
				listTeams: vi.fn().mockResolvedValue({
					data: [
						{ id: 'team-1', name: 'Engineering' },
						{ id: 'team-2', name: 'Design' }
					]
				})
			}
		}
	}
})

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual('@tanstack/react-query')
	return {
		...actual,
		useQuery: () => ({
			data: {
				data: [
					{ id: 'team-1', name: 'Engineering' },
					{ id: 'team-2', name: 'Design' }
				]
			}
		})
	}
})

vi.mock('@/components/ui/dialog', async () => {
	const React = await import('react')
	type DialogContextValue = {
		open: boolean
		onOpenChange: (open: boolean) => void
	}
	type TriggerChildProps = {
		onClick?: (event: React.MouseEvent<HTMLElement>) => void
	}
	const DialogContext = React.createContext<DialogContextValue | null>(null)

	const useDialogContext = () => {
		const context = React.useContext(DialogContext)
		if (!context) {
			throw new Error('Dialog components must be used within the dialog mock.')
		}
		return context
	}

	return {
		Dialog: ({
			open,
			onOpenChange,
			children
		}: DialogContextValue & { children: React.ReactNode }) => (
			<DialogContext.Provider value={{ open, onOpenChange }}>
				{children}
			</DialogContext.Provider>
		),
		DialogTrigger: ({
			children
		}: {
			children: React.ReactElement<TriggerChildProps>
			asChild?: boolean
		}) => {
			const { onOpenChange } = useDialogContext()
			return React.cloneElement(children, {
				onClick: (event) => {
					children.props.onClick?.(event)
					onOpenChange(true)
				}
			})
		},
		DialogContent: ({ children }: { children: React.ReactNode }) => {
			const { open } = useDialogContext()
			return open ? <div>{children}</div> : null
		},
		DialogHeader: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
		DialogFooter: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
		DialogTitle: ({ children }: { children: React.ReactNode }) => (
			<h2>{children}</h2>
		),
		DialogDescription: ({ children }: { children: React.ReactNode }) => (
			<p>{children}</p>
		)
	}
})

vi.mock('@/hooks/use-form', () => ({
	focusFirstError: vi.fn()
}))

vi.mock('@/hooks/tanstack-form', async () => {
	const React = await import('react')
	type ReactNode = React.ReactNode

	interface SubscribeProps {
		selector: (state: { isSubmitting: boolean }) => boolean
		children: (selected: boolean) => ReactNode
	}

	interface TextFieldProps {
		label: string
		type?: string
		placeholder?: string
		disabled?: boolean
		autoComplete?: string
	}

	interface SelectFieldProps {
		label: string
		options: Array<{ label: string; value: string }>
		disabled?: boolean
	}

	interface AppFieldProps {
		name: string
		children: (field: {
			TextField: (props: TextFieldProps) => ReactNode
			SelectField: (props: SelectFieldProps) => ReactNode
		}) => ReactNode
	}

	return {
		useAppForm: ({
			defaultValues,
			validators,
			onSubmit,
			onSubmitInvalid
		}: MockUseAppFormOptions) => {
			const [values, setValues] = React.useState(defaultValues)
			const [errors, setErrors] = React.useState<Record<string, string>>({})
			const [isSubmitting, setIsSubmitting] = React.useState(false)

			const reset = () => {
				setValues(defaultValues)
				setErrors({})
			}

			const handleSubmit = async () => {
				const parsed =
					validators?.onSubmit?.safeParse?.(values) ??
					validators?.onDynamic?.safeParse?.(values)

				if (parsed && !parsed.success) {
					const flattenedErrors = parsed.error.flatten()
					const fieldErrors: Record<string, string> = Object.fromEntries(
						Object.entries(flattenedErrors.fieldErrors)
							.filter(([, messages]) => messages?.[0])
							.map(([name, messages]) => [name, String(messages?.[0])])
					)

					setErrors(fieldErrors)
					onSubmitInvalid?.({
						formApi: {
							state: {
								fieldMeta: Object.fromEntries(
									Object.entries(fieldErrors).map(([name, message]) => [
										name,
										{ errors: [{ message }] }
									])
								)
							}
						}
					})
					return
				}

				setErrors({})
				setIsSubmitting(true)

				try {
					await onSubmit({ value: parsed?.success ? parsed.data : values })
				} finally {
					setIsSubmitting(false)
				}
			}

			const AppForm = ({ children }: { children: ReactNode }) => <>{children}</>
			const Subscribe = ({ selector, children }: SubscribeProps) =>
				children(selector({ isSubmitting }))
			const SubmitButton = ({ label }: { label: string }) => (
				<button
					type="button"
					disabled={isSubmitting}
					onClick={() => {
						void handleSubmit()
					}}
				>
					{label}
				</button>
			)
			const AppField = ({ name, children }: AppFieldProps) => {
				const updateValue = (value: string) => {
					setValues((current: Record<string, string>) => ({
						...current,
						[name]: value
					}))
					setErrors((current) => {
						const next = { ...current }
						delete next[name]
						return next
					})
				}

				return children({
					TextField: ({
						label,
						type,
						placeholder,
						disabled,
						autoComplete
					}: TextFieldProps) => (
						<div>
							<label htmlFor={name}>{label}</label>
							<input
								id={name}
								aria-label={label}
								name={name}
								type={type}
								value={values[name] ?? ''}
								placeholder={placeholder}
								disabled={disabled}
								autoComplete={autoComplete}
								onChange={(event) => updateValue(event.target.value)}
							/>
							{errors[name] && <div>{errors[name]}</div>}
						</div>
					),
					SelectField: ({ label, options, disabled }: SelectFieldProps) => (
						<div>
							<label htmlFor={name}>{label}</label>
							<select
								id={name}
								aria-label={label}
								name={name}
								value={values[name] ?? ''}
								disabled={disabled}
								onChange={(event) => updateValue(event.target.value)}
							>
								{options.map((option: { label: string; value: string }) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							{errors[name] && <div>{errors[name]}</div>}
						</div>
					)
				})
			}

			return { AppField, AppForm, Subscribe, SubmitButton, handleSubmit, reset }
		}
	}
})

describe('InviteMemberDialog', () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			value: vi.fn(),
			writable: true
		})
	})

	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('shows a validation error for an invalid email', async () => {
		const { default: InviteMemberDialog } = await import('./InviteMemberDialog')
		const inviteMemberMock = vi.fn()
		authClient.organization.inviteMember = inviteMemberMock
		render(<InviteMemberDialog />)

		fireEvent.click(screen.getByRole('button', { name: 'Invite Member' }))
		fireEvent.change(screen.getByLabelText('Email Address'), {
			target: { value: 'not-an-email' }
		})
		fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))

		expect(
			await screen.findByText('Please enter a valid email address')
		).toBeTruthy()
		expect(inviteMemberMock).not.toHaveBeenCalled()
	})

	it('submits the form with the default role and trimmed email', async () => {
		const { default: InviteMemberDialog } = await import('./InviteMemberDialog')
		const inviteMemberMock = vi.fn().mockResolvedValue(undefined)
		authClient.organization.inviteMember = inviteMemberMock
		const onInviteSent = vi.fn()

		render(<InviteMemberDialog onInviteSent={onInviteSent} />)

		fireEvent.click(screen.getByRole('button', { name: 'Invite Member' }))
		fireEvent.change(screen.getByLabelText('Email Address'), {
			target: { value: ' colleague@example.com ' }
		})
		fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))

		await waitFor(() => {
			expect(inviteMemberMock).toHaveBeenCalledWith({
				email: 'colleague@example.com',
				role: 'member'
			})
		})

		expect(onInviteSent).toHaveBeenCalledTimes(1)
		expect(toastSuccessMock).toHaveBeenCalledWith(
			'Invitation sent successfully!'
		)
		await waitFor(() => {
			expect(screen.queryByLabelText('Email Address')).toBeNull()
		})
	})

	it('shows the backend error and does not close on invite failure', async () => {
		const { default: InviteMemberDialog } = await import('./InviteMemberDialog')
		const inviteMemberMock = vi.fn().mockResolvedValue({
			error: { message: 'User is already a member' }
		})
		authClient.organization.inviteMember = inviteMemberMock
		const onInviteSent = vi.fn()

		render(<InviteMemberDialog onInviteSent={onInviteSent} />)

		fireEvent.click(screen.getByRole('button', { name: 'Invite Member' }))
		fireEvent.change(screen.getByLabelText('Email Address'), {
			target: { value: ' colleague@example.com ' }
		})
		fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))

		await waitFor(() => {
			expect(inviteMemberMock).toHaveBeenCalledWith({
				email: 'colleague@example.com',
				role: 'member'
			})
		})

		expect(toastErrorMock).toHaveBeenCalledWith('User is already a member')
		expect(toastSuccessMock).not.toHaveBeenCalled()
		expect(onInviteSent).not.toHaveBeenCalled()
		expect(screen.getByLabelText('Email Address')).toBeTruthy()
	})
})

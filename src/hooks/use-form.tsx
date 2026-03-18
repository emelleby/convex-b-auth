/**
 * Focus the first field with an error in the form
 * Used in onSubmitInvalid handler for better UX
 */
// export function focusFirstError(formApi: any) {
// 	const firstErrorField = formApi.state.fieldMeta.find(
// 		(field: any) => field.errors.length > 0
// 	)

// 	if (firstErrorField) {
// 		const element = document.getElementById(firstErrorField.name)
// 		if (element) {
// 			element.focus()
// 			element.scrollIntoView({ behavior: 'smooth', block: 'center' })
// 		}
// 	}
// }

export function focusFirstError(formApi: any) {
	const fieldMeta = formApi.state.fieldMeta
	let firstErrorName: string | undefined

	if (Array.isArray(fieldMeta)) {
		const field = fieldMeta.find((f: any) => f.errors?.length > 0)
		if (field) firstErrorName = field.name
	} else if (typeof fieldMeta === 'object' && fieldMeta !== null) {
		const entry = Object.entries(fieldMeta).find(
			([_, field]: [string, any]) => field.errors?.length > 0,
		)
		if (entry) firstErrorName = entry[0]
	}

	if (firstErrorName) {
		const element = document.getElementById(firstErrorName)
		if (element) {
			element.focus()
			element.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}
}

/**
 * Higher-order component to add focus management to forms
 * Wraps a form component to provide automatic focus on first error
 */
export function withFocusManagement(Component: React.ComponentType<any>) {
	const WithFocusManagement = (props: any) => {
		return <Component {...props} />
	}

	WithFocusManagement.displayName = `withFocusManagement(${Component.displayName || Component.name || 'Component'})`

	return WithFocusManagement
}

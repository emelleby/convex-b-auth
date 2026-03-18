import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { useFieldContext } from '@/hooks/form-context'
import { type Country, CountryDropdown } from './country-dropdown'

interface CountryFieldProps {
	label: string
	description?: string
	placeholder?: string
	disabled?: boolean
}

export function CountryField({
	label,
	description,
	placeholder,
	disabled,
}: CountryFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<CountryDropdown
				placeholder={placeholder}
				defaultValue={field.state.value}
				disabled={disabled}
				aria-invalid={isInvalid}
				onChange={(country: Country) => {
					field.handleChange(country.alpha3)
				}}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}

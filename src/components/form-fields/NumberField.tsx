import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@/components/ui/input-group'
import { useFieldContext } from '@/hooks/form-context'

interface NumberFieldProps {
	hidden?: boolean
	hideLabel?: boolean
	label?: string
	unit?: string
	description?: string
	placeholder?: string
	disabled?: boolean
	step?: string | number
	min?: string | number
	max?: string | number
	className?: string
}

export function NumberField({
	hidden,
	hideLabel,
	label,
	unit,
	description,
	placeholder,
	disabled,
	step,
	min,
	max,
	className,
}: NumberFieldProps) {
	const field = useFieldContext<number | undefined>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	const handleChange = (rawValue: string) => {
		// Convert empty string to undefined, otherwise to number
		const value = rawValue === '' ? undefined : Number(rawValue)
		field.handleChange(value)
	}

	return (
		<Field data-invalid={isInvalid} hidden={hidden}>
			{!hideLabel && label && (
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			)}
			{unit ? (
				<InputGroup>
					<InputGroupInput
						id={field.name}
						name={field.name}
						type="number"
						step={step}
						min={min}
						max={max}
						value={field.state.value ?? ''}
						onBlur={field.handleBlur}
						onChange={(e) => handleChange(e.target.value)}
						aria-invalid={isInvalid}
						placeholder={placeholder}
						disabled={disabled}
						className={className}
					/>
					<InputGroupAddon
						align="inline-end"
						className="bg-secondary/10 pl-2 pr-2 py-2 rounded-r-md"
					>
						{unit}
					</InputGroupAddon>
				</InputGroup>
			) : (
				<Input
					id={field.name}
					name={field.name}
					type="number"
					step={step}
					min={min}
					max={max}
					value={field.state.value ?? ''}
					onBlur={field.handleBlur}
					onChange={(e) => handleChange(e.target.value)}
					aria-invalid={isInvalid}
					placeholder={placeholder}
					disabled={disabled}
					className={className}
				/>
			)}
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}

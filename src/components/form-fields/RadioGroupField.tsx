import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFieldContext } from '@/hooks/form-context'

interface RadioGroupFieldProps {
	label: string
	description?: string
	options: { label: string; value: string }[]
	disabled?: boolean
}

export function RadioGroupField({
	label,
	description,
	options,
	disabled,
}: RadioGroupFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel>{label}</FieldLabel>
			<RadioGroup
				value={field.state.value}
				onValueChange={field.handleChange}
				className="flex flex-col gap-2"
				disabled={disabled}
			>
				{options.map((option) => (
					<div key={option.value} className="flex items-center space-x-2">
						<RadioGroupItem
							value={option.value}
							id={`${field.name}-${option.value}`}
						/>
						<Label
							htmlFor={`${field.name}-${option.value}`}
							className="font-normal"
						>
							{option.label}
						</Label>
					</div>
				))}
			</RadioGroup>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}

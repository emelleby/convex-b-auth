import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { useFieldContext } from '@/hooks/form-context'

interface SwitchFieldProps {
	label: string
	description?: string
	disabled?: boolean
}

export function SwitchField({
	label,
	description,
	disabled,
}: SwitchFieldProps) {
	const field = useFieldContext<boolean>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field
			orientation="horizontal"
			data-invalid={isInvalid}
			className="items-center"
		>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={field.handleChange}
				onBlur={field.handleBlur}
				disabled={disabled}
			/>
			<div className="flex flex-col gap-1">
				<FieldLabel htmlFor={field.name} className="font-normal cursor-pointer">
					{label}
				</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</div>
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}

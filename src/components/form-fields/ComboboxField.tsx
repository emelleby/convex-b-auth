import { CheckIcon, ChevronsUpDown, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useFieldContext } from '@/hooks/form-context'
import { cn } from '@/lib/utils'

interface ComboboxFieldProps {
	label: string
	description?: string
	placeholder?: string
	disabled?: boolean
	options: readonly string[] | string[]
	helperText?: string
}

export function ComboboxField({
	label,
	description,
	placeholder = 'Select from list or type a custom title...',
	disabled,
	options,
	helperText = '💡 Tip: You can type a custom title if none match',
}: ComboboxFieldProps) {
	const field = useFieldContext<string>()
	const [open, setOpen] = React.useState(false)
	const [searchValue, setSearchValue] = React.useState('')
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	// Filter options based on search
	const filteredOptions = React.useMemo(() => {
		if (!searchValue) return options
		return options.filter((option) =>
			option.toLowerCase().includes(searchValue.toLowerCase()),
		)
	}, [options, searchValue])

	// Check if current search is a custom value
	const isCustomValue =
		searchValue &&
		!options.some((opt) => opt.toLowerCase() === searchValue.toLowerCase())

	const handleSelect = (value: string) => {
		field.handleChange(value)
		setOpen(false)
		setSearchValue('')
	}

	const handleCustomAdd = () => {
		if (searchValue.trim()) {
			field.handleChange(searchValue.trim())
			setOpen(false)
			setSearchValue('')
		}
	}

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={field.name}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						aria-invalid={isInvalid}
						disabled={disabled}
						className={cn(
							'w-full justify-between',
							!field.state.value && 'text-muted-foreground',
						)}
					>
						{field.state.value || placeholder}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Search or type custom..."
							value={searchValue}
							onValueChange={setSearchValue}
						/>
						<CommandList>
							<CommandEmpty>
								{searchValue ? (
									<div className="text-sm text-muted-foreground p-2">
										No matching options found
									</div>
								) : (
									<div className="text-sm text-muted-foreground p-2">
										Start typing to search or add custom
									</div>
								)}
							</CommandEmpty>
							{helperText && !searchValue && (
								<div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
									{helperText}
								</div>
							)}
							<CommandGroup>
								{isCustomValue && searchValue.trim() && (
									<CommandItem
										onSelect={handleCustomAdd}
										className="cursor-pointer"
									>
										<Plus className="mr-2 h-4 w-4" />
										<span>Add &quot;{searchValue}&quot;</span>
									</CommandItem>
								)}
								{filteredOptions.map((option) => (
									<CommandItem
										key={option}
										value={option}
										onSelect={() => handleSelect(option)}
										className="cursor-pointer"
									>
										<CheckIcon
											className={cn(
												'mr-2 h-4 w-4',
												field.state.value === option
													? 'opacity-100'
													: 'opacity-0',
											)}
										/>
										{option}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}


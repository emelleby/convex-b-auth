import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { useImageUpload } from '@/hooks/use-image-upload'
import { cn } from '@/lib/utils'

interface ImageFieldProps {
	field: any
	label: string
	description?: string
	disabled?: boolean
	imageUpload: ReturnType<typeof useImageUpload>
}

export function ImageField({
	field,
	label,
	description,
	disabled,
	imageUpload
}: ImageFieldProps) {
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	const {
		previewUrl,
		fileName,
		fileInputRef,
		handleThumbnailClick,
		handleFileChange,
		handleRemove
	} = imageUpload

	const [isDragging, setIsDragging] = React.useState(false)

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		if (!disabled) setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}

	const handleDrop = React.useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (disabled) return
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			const file = e.dataTransfer.files?.[0]
			if (file?.type.startsWith('image/')) {
				const fakeEvent = {
					target: {
						files: [file]
					}
				} as unknown as React.ChangeEvent<HTMLInputElement>
				handleFileChange(fakeEvent)
			}
		},
		[handleFileChange, disabled]
	)

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel>{label}</FieldLabel>
			<Input
				type="file"
				accept="image/*"
				className="hidden"
				ref={fileInputRef}
				onChange={handleFileChange}
				disabled={disabled}
			/>

			{!previewUrl ? (
				<div
					onClick={!disabled ? handleThumbnailClick : undefined}
					onKeyDown={(e) => {
						if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
							handleThumbnailClick()
						}
					}}
					onDragOver={handleDragOver}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					tabIndex={disabled ? -1 : 0}
					role="button"
					aria-label="Upload image"
					className={cn(
						'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						isDragging && 'border-primary/50 bg-primary/5',
						disabled && 'cursor-not-allowed opacity-50'
					)}
				>
					<div className="rounded-full bg-background p-3 shadow-sm">
						<ImagePlus className="h-6 w-6 text-muted-foreground" />
					</div>
					<div className="text-center">
						<p className="text-sm font-medium">Click to select</p>
						<p className="text-xs text-muted-foreground">or drag and drop</p>
					</div>
				</div>
			) : (
				<div className="relative">
					<div className="group relative h-48 overflow-hidden rounded-lg border">
						<img
							src={previewUrl}
							alt="Preview"
							className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
						/>
						{!disabled && (
							<>
								<div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
								<div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
									<Button
										type="button"
										size="sm"
										variant="secondary"
										onClick={handleThumbnailClick}
										className="h-9 w-9 p-0"
									>
										<Upload className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										size="sm"
										variant="destructive"
										onClick={() => {
											handleRemove()
											field.handleChange(undefined)
										}}
										className="h-9 w-9 p-0"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</>
						)}
					</div>
					{fileName && (
						<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<span className="truncate">{fileName}</span>
							{!disabled && (
								<button
									type="button"
									onClick={() => {
										handleRemove()
										field.handleChange(undefined)
									}}
									className="ml-auto rounded-full p-1 hover:bg-muted"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					)}
				</div>
			)}
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}

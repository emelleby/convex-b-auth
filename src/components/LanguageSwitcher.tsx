import { ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Language {
	code: string;
	label: string;
}

export interface LanguageSwitcherProps {
	languages: Language[];
	value?: string;
	align?: "start" | "center" | "end";
	variant?: "outline" | "ghost";
	onChange?: (code: string) => void | Promise<void>;
	className?: string;
	showIcon?: boolean;
}

export function LanguageSwitcher({
	languages,
	value = "",
	align = "end",
	variant = "outline",
	onChange,
	className,
	showIcon = false,
}: LanguageSwitcherProps) {
	const currentLanguage = languages.find((lang) => lang.code === value);
	const displayLabel =
		currentLanguage?.label || languages[0]?.label || "Language";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant={variant} size="sm" className={cn("gap-2", className)}>
					{showIcon ? <Globe className="size-4" /> : displayLabel}
					{!showIcon && <ChevronDown className="size-4" />}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align}>
				{languages.map((language) => (
					<DropdownMenuItem
						key={language.code}
						onClick={() => onChange?.(language.code)}
						className={cn(
							"cursor-pointer",
							value === language.code && "bg-accent",
						)}
					>
						{language.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default LanguageSwitcher;

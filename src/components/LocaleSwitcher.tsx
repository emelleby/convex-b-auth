// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale

import { m } from "@/paraglide/messages";
import { getLocale, locales, setLocale } from "@/paraglide/runtime";
import { type Language, LanguageSwitcher } from "./LanguageSwitcher";

export default function ParaglideLocaleSwitcher() {
	const currentLocale = getLocale();

	const languages: Language[] = locales.map((locale) => ({
		code: locale,
		label: locale.toUpperCase(),
	}));

	return (
		<div
			style={{
				display: "flex",
				gap: "0.5rem",
				alignItems: "center",
				color: "inherit",
			}}
			aria-label={m.language_label()}
		>
			<span style={{ opacity: 0.85 }}>
				{m.current_locale({ locale: currentLocale })}
			</span>
			<LanguageSwitcher
				languages={languages}
				value={currentLocale}
				onChange={(code) => setLocale(code as typeof currentLocale)}
				variant="outline"
				align="end"
			/>
		</div>
	);
}

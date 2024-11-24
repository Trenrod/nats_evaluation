/**
 * Removes leading whitespace from each line in a template literal.
 * created by chatgpt
 * 
 * @param {TemplateStringsArray} strings - The template strings array.
 * @param {...any[]} values - The values to be interpolated into the template.
 * @returns {string} The dedented string.
 */
export function dedent(strings: TemplateStringsArray, ...values: any[]): string {
	let raw = strings.raw;
	let result = "";

	for (let i = 0; i < raw.length; i++) {
		result += raw[i].replace(/\n[\t ]+/g, "\n"); // Remove leading whitespace from each line
		if (i < values.length) {
			result += values[i];
		}
	}

	return result.trim();
}

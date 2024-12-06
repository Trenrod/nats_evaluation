/**
 * Calculates spaces from first line and remotes them for all lines
 * 
 * @param {TemplateStringsArray} strings - The template strings array.
 * @param {...any[]} values - The values to be interpolated into the template.
 * @returns {string} The dedented string.
 */
export function prettyFormat(natsConfigString: string): string {
	let result = "";
	const regMatch = natsConfigString.match("\n\t+");
	if (regMatch?.[0] == null) {
		return natsConfigString;
	}
	result = natsConfigString.replaceAll(regMatch[0], "\n");
	return result.trim();
}

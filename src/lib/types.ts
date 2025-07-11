export type Doc = {
	url: string
	content: string
	file: string
	frontmatter?: { [key: string]: unknown }
}

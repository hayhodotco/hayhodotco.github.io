import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { file } from 'bun'
import matter from 'gray-matter'
import { marked } from 'marked'

type Page = {
	url: string
	content: string
	file: string
	frontmatter?: { [key: string]: unknown }
}

const CONTENT_DIR = 'content'
const OUT_DIR = 'docs'
const TEMPLATE_DIR = 'templates'

const encoder = new TextEncoder()
// const decoder = new TextDecoder('utf-8')

const get_markdown_files = async (
	dir: string
): Promise<ReadonlyArray<string>> => {
	const files = await readdir(resolve(dir), { recursive: true })
	return files.filter(
		(file) => file.endsWith('.md') && !file.endsWith('index.md')
	)
}

const parse = async (source: string): Promise<Page> => {
	const path = resolve(CONTENT_DIR, source)
	const text = await file(path).text()
	const parsed = matter(text)
	// console.log('parsed', parsed)
	const { data, content } = parsed
	const html = marked(content)

	return {
		content: html as string,
		file: path,
		frontmatter: {
			...data,
			date: data.date || new Date().toISOString(),
		},
		url: `${source.replace('.md', '.html')}`,
	}
}

const render = (template: string, parsed: Page) =>
	template
		.replaceAll('{{TITLE}}', parsed.frontmatter?.title as string)
		.replaceAll('{{CONTENT}}', parsed.content)

const main = async () => {
	console.log('🚀 Bắt đầu quá trình xây dựng...')
	// console.log(`🔨 Đang xử lý: ${file}`)

	// 1. read all markdown files in a target folder
	const markdown_files = await get_markdown_files(CONTENT_DIR)
	// console.table(markdown_files)

	// 2. parse each markdown file
	const parsed_files = await Promise.all(markdown_files.map(parse))
	console.table(parsed_files, ['file', 'url'])
	console.log(parsed_files)

	// 3. generate all files like this
	for await (const parsed of parsed_files) {
		// 3.1. insert parsed markdown into a HTML template
		const layout = parsed.frontmatter?.layout
			? `${parsed.frontmatter.layout}.html`
			: 'page.html'
		const template = await file(resolve(TEMPLATE_DIR, layout)).text()
		const rendered_post = render(template, parsed)
		// console.log(rendered_post)
		// 3.2. write the generated HTML into files in public folder
		const destination = resolve(OUT_DIR, parsed.url)
		const data = encoder.encode(rendered_post) // Uint8Array
		// console.log(resolve(OUT_DIR, destination))
		await file(destination).write(data)
	}
}

main()

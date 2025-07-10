import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { file } from 'bun'
import matter from 'gray-matter'
import { marked } from 'marked'
import nunjucks from 'nunjucks'
import site from './site.json'

type Page = {
	url: string
	content: string
	file: string
	frontmatter?: { [key: string]: unknown }
}

const PUBLIC_DIR = 'public'
const CONTENT_DIR = 'content'
const OUT_DIR = 'docs'
const TEMPLATE_DIR = 'templates'
const DEFAULT_LAYOUT = 'page.html'

// const encoder = new TextEncoder()
// const decoder = new TextDecoder('utf-8')

const njk = nunjucks.configure(TEMPLATE_DIR, {
	autoescape: false,
})

const copy_public_files = async () => {
	const files = await readdir(resolve(PUBLIC_DIR), { recursive: true })
	for (const file of files) {
		console.log(`🔨 Đang xử lý: ${file}`)
		const source = resolve(PUBLIC_DIR, file)
		const dest = resolve(OUT_DIR, file)
		const source_file = Bun.file(source)
		await Bun.file(dest).write(source_file)
	}
}

const copy_attachments = async () => {
	const files = await readdir(resolve(CONTENT_DIR, 'attachments'), {
		recursive: true,
	})
	for (const file of files) {
		console.log(`🔨 Đang xử lý: ${file}`)
		const source = resolve(CONTENT_DIR, 'attachments', file)
		const dest = resolve(OUT_DIR, 'attachments', file)
		const source_file = Bun.file(source)
		await Bun.file(dest).write(source_file)
	}
}

const get_markdown_files = async (
	dir: string
): Promise<ReadonlyArray<string>> => {
	const files = await readdir(resolve(dir), { recursive: true })
	return files.filter((file) => file.endsWith('.md'))
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

// const render = (template: string, parsed: Page) =>
// 	template
// 		.replaceAll('{{SITE_NAME}}', site.name)
// 		.replaceAll('{{SITE_DESCRIPTION}}', site.description)
// 		.replaceAll('{{TITLE}}', (parsed.frontmatter?.title as string) ?? '')
// 		.replaceAll('{{CONTENT}}', parsed.content)

const render = (parsed: Page) => {
	const layout = parsed.frontmatter?.layout
		? `${(parsed.frontmatter?.layout as string).toLowerCase()}.html`
		: DEFAULT_LAYOUT
	// wip: rewriter
	const rewriter = new HTMLRewriter()
		.on('[rel="icon"]', {
			element(el) {
				const href = el.getAttribute('href')
				console.log(href)
				if (href?.startsWith('/')) {
					el.setAttribute('href', `.${href}`)
				}
			},
		})
		.on('img', {
			element(el) {
				const src = el.getAttribute('src')
				console.log(src)
				if (src?.startsWith('/')) {
					el.setAttribute('src', `.${src}`)
				}
			},
		})
	const render = njk.render(layout, {
		content: parsed.content,
		description: site.description,
		locale: site.locale,
		site_name: site.name,
		title: parsed.frontmatter?.title ?? '',
	})
	const result = rewriter.transform(render)
	// return njk.render(layout, {
	// 	content: parsed.content,
	// 	description: site.description,
	// 	site_name: site.name,
	// 	title: parsed.frontmatter?.title ?? '',
	// })
	return result
}

const main = async () => {
	// console.log('🚀 Bắt đầu quá trình xây dựng...')
	// console.log(`🔨 Đang xử lý: ${file}`)
	await copy_public_files()
	await copy_attachments()

	// 1. read all markdown files in a target folder
	const markdown_files = await get_markdown_files(CONTENT_DIR)
	// console.table(markdown_files)

	// 2. parse each markdown file
	const parsed_files = await Promise.all(markdown_files.map(parse))
	console.table(parsed_files, ['file', 'url'])
	// console.log(parsed_files)

	// 3. generate all files like this
	for await (const parsed of parsed_files) {
		// 3.1. insert parsed markdown into a HTML template
		// const layout = parsed.frontmatter?.layout
		// 	? `${(parsed.frontmatter?.layout as string).toLowerCase()}.html`
		// 	: 'page.html'
		// const template = await file(resolve(TEMPLATE_DIR, layout)).text()
		// const rendered_post = render(template, parsed)
		const rendered_post = render(parsed)
		// console.log(rendered_post)
		// 3.2. write the generated HTML into files in public folder
		const destination = resolve(OUT_DIR, parsed.url)
		// const data = encoder.encode(rendered_post) // Uint8Array
		// await file(destination).write(data)
		await file(destination).write(rendered_post)
	}

	// console.log('📦 Đang gói các tài sản...')

	// await Bun.build({
	// 	entrypoints: ['./index.ts'], // Ví dụ: nếu bạn có tệp JS/TS chính
	// 	minify: true,
	// 	outdir: './docs/assets',
	// })

	console.log('\n🎉 Quá trình xây dựng hoàn tất!')
}

main()

import { access, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import nunjucks from 'nunjucks'
import site from '../../site.json'
import type { Page } from './types'

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1)
export const get_all_markdowns = async (
	dir: string
): Promise<ReadonlyArray<string>> => {
	console.log(`Getting all files from ${dir}...`)
	const files = await readdir(resolve(dir), { recursive: true })
	console.log(`Found ${files.length} files`)
	return files.filter((file) => file.endsWith('.md'))
}
export const copy_files = async (
	src_dir: string,
	dest_dir: string
): Promise<void> => {
	if (!access(src_dir)) {
		throw new Error(`Source directory ${src_dir} does not exist`)
	}
	// if (!access(dest_dir)) {
	// 	await mkdir(dest_dir, { recursive: true })
	// }
	console.log(`Getting all files from ${src_dir}...`)
	const files = await readdir(resolve(src_dir), { recursive: true })
	console.log(`Found ${files.length} files`)
	for (const file of files) {
		console.log(`Copying ${file}...`)
		const srcPath = resolve(src_dir, file)
		const destPath = resolve(dest_dir, file)
		const src = Bun.file(srcPath)
		await Bun.file(destPath).write(src)
	}
}
export const parse_markdown = async (
	dir: string,
	source: string
): Promise<Page> => {
	const path = resolve(dir, source)
	console.log(`Parsing ${source}...`)
	const text = await Bun.file(path).text()
	const parsed = matter(text)
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

export const template_render = async (
	dir: string,
	template: string,
	data: Page
): Promise<string> => {
	const layout = data.frontmatter?.layout
		? `${(data.frontmatter?.layout as string).toLowerCase()}.html`
		: `${template}.html`
	const njk = nunjucks.configure(dir, {
		autoescape: false,
	})
	// TODO: Bun.HTMLRewriter
	const rendered = njk.render(layout, {
		content: data.content,
		description: data.frontmatter?.description ?? site.description,
		locale: site.locale,
		site_name: site.name,
		title: data.frontmatter?.title ?? '',
	})
	return rendered
	// const rewriter = new HTMLRewriter().on('title', new TitleHandler())
	// const result = rewriter.transform(render)
	// return result
}

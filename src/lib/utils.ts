import { access, exists, mkdir, readdir } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { file, Glob, write } from 'bun'
import matter from 'gray-matter'
import { marked } from 'marked'
import nunjucks from 'nunjucks'
import sharp from 'sharp'
import site from '~config'
import {
	DEFAULT_LAYOUT,
	INPUT_DIR,
	OUTPUT_DIR,
	TEMPLATE_DIR,
} from '~lib/constants'
import type { Page } from '~lib/types'

// export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

// get files
export const get_files = async (
	dir: string,
	pattern: string
): Promise<ReadonlyArray<string>> => {
	if (!access(dir)) {
		throw new Error(`Directory ${dir} does not exist`)
	}

	console.log(`Getting all files (${pattern}) from '${dir}' directory...`)
	const glob = new Glob(pattern)
	const scanned = glob.scan(dir)
	const files = []
	for await (const file of scanned) {
		// console.log(`Scanning ${file}...`)
		files.push(file)
	}

	console.log(`Found ${files.length} files`)
	return files
}
// export const get_all_markdowns = async (
// 	dir: string
// ): Promise<ReadonlyArray<string>> => {
// 	console.log(`Getting all files from ${dir}...`)
// 	const files = await readdir(resolve(dir), { recursive: true })
// 	console.log(`Found ${files.length} files`)
// 	return files.filter((file) => file.endsWith('.md'))
// }

export const copy_files = async (
	src_dir: string,
	dest_dir: string
): Promise<ReadonlyArray<Record<string, string>>> => {
	if (!access(src_dir)) {
		throw new Error(`Source directory ${src_dir} does not exist`)
	}
	// if (!access(dest_dir)) {
	// 	await mkdir(dest_dir, { recursive: true })
	// }
	console.log(
		`Copying all files from '${src_dir}' directory to '${dest_dir}' directory...`
	)
	const files = await readdir(resolve(src_dir), { recursive: true })
	console.log(`Found ${files.length} files`)
	const copied_files = []
	for (const file of files) {
		// console.log(`Copying ${file}...`)
		const srcPath = resolve(src_dir, file)
		const destPath = resolve(dest_dir, file)
		const src = Bun.file(srcPath)
		await write(destPath, src)
		copied_files.push({
			dest: `/${dest_dir}/${file}`,
			src: `/${src_dir}/${file}`,
		})
	}
	return copied_files
}

// convert image
export const img_converter = async (
	src: string,
	width?: number,
	quality: number = 80
): Promise<string> => {
	const input = resolve('.', INPUT_DIR, src)
	const input_exists = await exists(input)
	// console.log(dirname(src).replaceAll('.', ''))
	const output = `${OUTPUT_DIR}${dirname(src).replaceAll('.', '')}`
	const output_exists = await exists(output)
	const output_path = `${output}/${basename(src)}-converted.webp`

	if (!input_exists) {
		throw new Error(`File ${input} does not exist`)
	}

	if (!output_exists) {
		await mkdir(output, { recursive: true })
	}

	// const bytes = await file(input).bytes()
	// console.log(bytes)

	let img = sharp(input)
	if (width) {
		img = img.resize(width)
	}
	await img.webp({ quality }).toFile(output_path)

	return output_path.replaceAll(OUTPUT_DIR, '')
}

// markdown parser
export const parser = async (source: string): Promise<Page> => {
	const file = resolve(INPUT_DIR, source)
	// console.log(`Parsing ${source}...`)
	const text = await Bun.file(file).text()
	const parsed = matter(text)
	const { data, content } = parsed
	const html = marked(content)
	return {
		content: html as string,
		file: source,
		frontmatter: {
			...data,
			date: data.date || new Date().toISOString(),
		},
		url: `${source.replace('.md', '.html')}`,
	}
}

// template render
export const renderer = async (data: Page): Promise<string> => {
	const layout = data.frontmatter?.layout
		? `${(data.frontmatter?.layout as string).toLowerCase()}.html`
		: `${DEFAULT_LAYOUT}.html`
	const njk = nunjucks.configure(TEMPLATE_DIR, {
		autoescape: false,
	})
	const rendered = njk.render(layout, {
		content: data.content,
		description: data.frontmatter?.description ?? site.description,
		generator: `HayhoCMS v${Bun.version}`,
		locale: site.locale,
		site_name: site.name,
		title: data.frontmatter?.title ?? '',
	})
	// return rendered
	// TODO: Bun.HTMLRewriter, convert assets
	const rewriter = new HTMLRewriter().on('img', {
		async element(el) {
			const src = el.getAttribute('src')
			// console.log('img:dirname', dirname(src as string))
			// console.log('img:basename', basename(src as string))
			const img = await img_converter(src as string, 800, 100)
			console.log('img_converter', img)
			el.setAttribute('src', img)
			// if (src?.startsWith('./')) {
			// 	el.setAttribute('src', `${src.slice(1)}`)
			// }
		},
	})
	const result = rewriter.transform(rendered)
	return result
}

// html generator
export const generator = async (
	data: Page
): Promise<Record<string, string>> => {
	const destination = resolve(OUTPUT_DIR, data.url)
	const rendered = await renderer(data)
	await write(destination, rendered)
	return {
		dest: `/${OUTPUT_DIR}/${data.url}`,
		src: `/${INPUT_DIR}/${data.file}`,
	}
}

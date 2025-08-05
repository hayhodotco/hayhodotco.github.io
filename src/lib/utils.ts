import { access, exists, mkdir, readdir } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { file, Glob, write } from 'bun'
import matter from 'gray-matter'
import { marked } from 'marked'
import nunjucks from 'nunjucks'
import sharp from 'sharp'
import { CONFIG } from '~lib/config'
import {
	DEFAULT_LAYOUT,
	INPUT_DIR,
	IS_PROD,
	OUTPUT_DIR,
	TEMPLATE_DIR,
} from '~lib/constants'
import type { Doc } from '~lib/types'

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

	console.log(`Found ${files.length} file(s)`)
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

// markdown parser
export const parser = async (source: string): Promise<Doc> => {
	const path = resolve(INPUT_DIR, source)
	console.log(`Parsing ${source}...`)
	const text = await file(path).text()
	const parsed = matter(text)
	const { data, content } = parsed
	const html = marked(content)
	return {
		content: html as string,
		file: relative('.', path),
		frontmatter: {
			...data,
			date: data.date || new Date().toISOString(),
		},
		url: `/${source.replace('index', '/').replace('.md', '')}`,
	}
}

// template render
export const renderer = async (data: Doc): Promise<string> => {
	const layout = data.frontmatter?.layout
		? `${(data.frontmatter?.layout as string).toLowerCase()}.html`
		: `${DEFAULT_LAYOUT}.html`
	const njk = nunjucks.configure(TEMPLATE_DIR, {
		autoescape: false,
	})
	const rendered = njk.render(layout, {
		content: data.content,
		description: data.frontmatter?.description ?? CONFIG.description,
		generator: `HayhoCMS v${Bun.version}`,
		locale: CONFIG.locale,
		site_name: CONFIG.name,
		title: data.frontmatter?.title ?? '',
	})
	// return rendered
	// TODO: Bun.HTMLRewriter, convert assets
	const rewriter = new HTMLRewriter().on('img', {
		async element(el) {
			const src = el.getAttribute('src') as string
			const src_dirname = dirname(src).replaceAll('.', '')
			const src_basename = basename(src).replaceAll('.', '_')
			const dest = `${OUTPUT_DIR}${src_dirname}`
			const dest_exists = await exists(dest)
			const input = resolve('.', INPUT_DIR, src)
			const img_file = file(input)
			// const img_exists = await img_file.exists()
			const img_contents = await img_file.bytes()
			const img_type = img_file.type
			const output = `${dest}/${src_basename}-${Date.now()}.webp`
			const src_new = IS_PROD
				? `${src_dirname}/${src_basename}-${Date.now()}.webp`
				: `data:${img_type};base64,${img_contents.toBase64()}`

			console.log('relative', relative('.', input))
			console.log('input', src, 'output', src_new.substring(0, 50))

			if (IS_PROD) {
				if (!dest_exists) await mkdir(dest, { recursive: true })
				const img = sharp(img_contents)
				// if (width) {
				// 	img = img.resize(width)
				// }
				await img.resize(500).webp({ quality: 80 }).toFile(output)
			}

			el.setAttribute('src', src_new)
		},
	})
	const result = rewriter.transform(rendered)
	return result
}

// html generator
export const generator = async (data: Doc): Promise<Record<string, string>> => {
	// console.log('destination', resolve(OUTPUT_DIR, data.url, 'index.html'))
	const destination = resolve(OUTPUT_DIR, data.url, 'index.html')
	const rendered = await renderer(data)
	console.log(destination, rendered.substring(0, 50))
	// await write(destination, rendered)
	return {
		dest: `/${OUTPUT_DIR}/${join(data.url, 'index.html')}`,
		src: `/${INPUT_DIR}/${data.file}`,
	}
}

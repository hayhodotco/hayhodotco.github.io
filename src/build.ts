import { resolve } from 'node:path'
import {
	ASSET_DIR,
	DEFAULT_LAYOUT,
	INPUT_DIR,
	OUTPUT_DIR,
	PUBLIC_DIR,
	TEMPLATE_DIR,
} from './lib/constants'
import {
	copy_files,
	get_all_markdowns,
	parse_markdown,
	template_render,
} from './lib/utils'

export const main = async () => {
	console.log('🚀 Starting build...')

	// 1. get all markdown files
	const markdown_files = await get_all_markdowns(INPUT_DIR)
	console.log(`Found ${markdown_files.length} markdowns`)

	// 2. parse each markdown file
	const parsed_files = await Promise.all(
		markdown_files.map((file) => parse_markdown(INPUT_DIR, file))
	)
	console.table(parsed_files, ['file', 'url'])
	// for await (const file of markdown_files) {
	// 	console.log(file)
	// 	const parsed = await parse_markdown(INPUT_DIR, file)
	// 	console.log(parsed)
	// }

	// 3. generate all files like this
	for await (const parsed of parsed_files) {
		const rendered_post = await template_render(
			TEMPLATE_DIR,
			DEFAULT_LAYOUT,
			parsed
		)
		const destination = resolve(OUTPUT_DIR, parsed.url)
		await Bun.file(destination).write(rendered_post)
	}

	// 4. copy public files
	await copy_files(PUBLIC_DIR, OUTPUT_DIR)

	// 5. copy assets files
	const assets_dir = resolve(INPUT_DIR, ASSET_DIR)
	const copy_dir = resolve(OUTPUT_DIR, ASSET_DIR)
	await copy_files(assets_dir, copy_dir)
	// console.log(assets_dir, copy_dir)

	console.log('\n🎉 Build complete!')
}

try {
	await main()
} catch (error) {
	console.error(error)
	process.exit(1)
}

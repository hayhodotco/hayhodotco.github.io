import { INPUT_DIR, OUTPUT_DIR, PUBLIC_DIR } from '~lib/constants'
import { copy_files, generator, get_files, parser } from '~lib/utils'

export const main = async () => {
	try {
		console.log('🚀 Starting build...')

		// 1. get all markdown files
		const markdown_files = await get_files(INPUT_DIR, '**/*.md')

		// 2. parse each markdown file
		const parsed_files = await Promise.all(markdown_files.map(parser))
		console.table(parsed_files, ['file'])

		// 3. generate all html files
		const generated_files = await Promise.all(parsed_files.map(generator))
		console.table(generated_files, ['src', 'dest'])

		// 4. copy public files
		const copied_files = await copy_files(PUBLIC_DIR, OUTPUT_DIR)
		console.table(copied_files, ['src', 'dest'])

		// 5. copy assets files
		// const assets_dir = resolve(INPUT_DIR, ASSET_DIR)
		// const copy_dir = resolve(OUTPUT_DIR, ASSET_DIR)
		// await copy_files(assets_dir, copy_dir)
		// console.log(assets_dir, copy_dir)

		console.log('\n🎉 Build complete!')
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

await main()

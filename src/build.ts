import { INPUT_DIR, IS_PROD, OUTPUT_DIR, PUBLIC_DIR } from '~lib/constants'
import { copy_files, generator, get_files, parser } from '~lib/utils'

export const main = async () => {
	try {
		console.log('IS_PROD', IS_PROD)

		console.log('🚀 Starting build...')

		// 1. get all markdown files
		const markdown_files = await get_files(INPUT_DIR, '**/*.md')

		// 2. parse each markdown file
		const parsed_files = await Promise.all(markdown_files.map(parser))
		console.table(parsed_files, ['file', 'url'])

		// 3. generate all html files
		const generated_files = await Promise.all(parsed_files.map(generator))
		console.table(generated_files, ['src', 'dest'])

		// 4. copy public files
		const copied_files = await copy_files(PUBLIC_DIR, OUTPUT_DIR)
		console.table(copied_files, ['src', 'dest'])

		console.log('\n🎉 Build complete!')
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

await main()

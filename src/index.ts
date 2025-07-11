import { img_converter } from '~lib/utils'

async function main() {
	const convertedImagePath = await img_converter('assets/hayho-ava.png')
	console.log(`Converted image saved at: ${convertedImagePath}`)
}

await main()

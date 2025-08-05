// import { file } from 'bun'
// import { parse } from 'yaml'

// const text = await file('site.yaml').text()
// const json = parse(text)
// console.log(json.favicon)

import { ROOT_DIR } from '~lib/constants'
import { get_files } from '~lib/utils'

console.log(ROOT_DIR)

const files = await get_files(ROOT_DIR, '**[!node_modules]/*.{md,mdx}')
console.log(files)

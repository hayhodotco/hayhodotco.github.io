import { file } from 'bun'
import { parse } from 'yaml'
import * as z from 'zod'

const schema = z.object({
	title: z.string().min(1).max(100),
})

const text = await file('site.yaml').text()
const json = await parse(text)
const config = schema.parse(json)
console.log('config', config)
console.log('jsonschema', z.toJSONSchema(schema))

export const CONFIG = { ...json }

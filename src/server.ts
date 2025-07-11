import { resolve } from 'node:path'
import { file, serve } from 'bun'
import { INPUT_DIR } from '~lib/constants'
import { parser, renderer } from '~lib/utils'

export const main = async () => {
	try {
		const server = serve({
			development: true,
			port: 3000,
			routes: {
				'/': () => new Response('Hello World!'),
				'/:page': async (req) => {
					console.log(`/:page - ${req.url}`)
					try {
						const path = resolve(INPUT_DIR, `${req.params.page}.md`)
						const static_file = file(path)
						const file_exists = await static_file.exists()
						// const file_contents = await static_file.bytes()
						// const file_type = static_file.type

						if (!file_exists)
							return new Response('Not Founds', { status: 404 })

						// return new Response(file_contents, {
						// 	headers: { 'content-type': file_type },
						// })

						const parsed = await parser(`${req.params.page}.md`)
						const rendered = await renderer(parsed)
						return new Response(rendered, {
							headers: {
								'content-type': 'text/html',
							},
						})
					} catch (error) {
						console.error((error as string).toString())
						if (
							(error as string)
								.toString()
								.startsWith(
									'Error: ENOENT: no such file or directory, open '
								)
						) {
							return new Response('Not Found', { status: 404 })
						}
						return new Response('Internal Server Error', {
							status: 500,
						})
					}
				},
				'/*': (req) => {
					console.log(`/* - ${req.url}`)
					return new Response('Not Found', { status: 404 })
				},
			},
			// fetch(req, server) {
			// 	const ip = server.requestIP(req)
			// 	const slug = new URL(req.url).pathname
			// 	console.log(slug)
			// 	return new Response(`Your IP is ${ip?.address || 'unknown'}`)
			// 	return new Response('Not Found', { status: 404 })
			// },
		})
		console.log(`Server listening on ${server.url}`)
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

await main()

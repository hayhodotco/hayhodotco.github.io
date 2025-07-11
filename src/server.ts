import { lstat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { file, serve } from 'bun'
import { OUTPUT_DIR } from '~lib/constants'

export const main = async () => {
	try {
		const server = serve({
			development: true,
			// fetch(req, server) {
			// 	const ip = server.requestIP(req)
			// 	// 	const slug = new URL(req.url).pathname
			// 	console.log(ip?.address)
			// 	return new Response(`Your IP is ${ip?.address || 'unknown'}`)
			// 	// 	return new Response('Not Found', { status: 404 })
			// },
			port: 3000,
			routes: {
				'/*': async (req) => {
					console.log(import.meta.env.NODE_ENV)
					console.log(`[*] ${new URL(req.url).pathname}`)

					try {
						const url = new URL(req.url)
						const path = resolve(OUTPUT_DIR, url.pathname.slice(1))
						const is_dir = (await lstat(path)).isDirectory()
						console.log(path)
						let bytes: Uint8Array
						let type: string

						if (is_dir) {
							bytes = await file(`${path}/index.html`).bytes()
							type = file(`${path}/index.html`).type
						} else {
							bytes = await file(path).bytes()
							type = file(path).type
						}
						return new Response(bytes, {
							headers: { 'content-type': type },
						})
					} catch (err) {
						console.error(err)
						const err_msg = err?.toString()
						if (err_msg?.includes('ENOENT')) {
							return new Response('Not Found', { status: 404 })
						}
						return new Response('Internal Server Error', {
							status: 500,
						})
					}
				},
			},
		})
		console.log(`Server listening on ${server.url}`)
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

await main()

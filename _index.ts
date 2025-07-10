import { resolve } from 'node:path'
import { file, serve } from 'bun'
import matter from 'gray-matter'
import { marked } from 'marked'
import nunjucks from 'nunjucks'
import site from './site.json'

const TEMPLATE_DIR = 'templates'
const DEFAULT_LAYOUT = 'page.html'
const CONTENT_DIR = 'content'
const PUBLIC_DIR = 'public'

const njk = nunjucks.configure(TEMPLATE_DIR, { autoescape: false })

const server = serve({
	development: true,
	fetch: async (_req, _server) => {
		// Return 404 for unmatched routes
		return new Response('Not Found', { status: 404 })
		// const ip = server.requestIP(req)
		// return new Response(`Your IP is ${ip}`)
	},
	port: 3000,
	routes: {
		'/': (req, server) => {
			const ip = server.requestIP(req)
			return new Response(`Your IP is ${ip?.address}`)
		},
		'/:page': async (req) => {
			const md_file = file(resolve(CONTENT_DIR, `${req.params?.page}.md`))
			const md_exists = await md_file.exists()
			if (!md_exists) {
				return new Response('Not Found', { status: 404 })
			}
			const text = await md_file.text()
			const parsed = matter(text)
			const { data: frontmatter, content } = parsed
			const html = marked(content)
			const layout = frontmatter.layout
				? `${(frontmatter.layout as string).toLowerCase()}.html`
				: DEFAULT_LAYOUT
			const render = njk.render(layout, {
				content: html,
				description: site.description,
				locale: site.locale,
				site_name: site.name,
				title: frontmatter.title ?? '',
			})
			const rewriter = new HTMLRewriter()
				.on('[rel="icon"]', {
					element(el) {
						const href = el.getAttribute('href')
						console.log(href)
						if (href?.startsWith('/')) {
							el.setAttribute('href', `.${href}`)
						}
					},
				})
				.on('img', {
					element(el) {
						const src = el.getAttribute('src')
						console.log(src)
						if (src?.startsWith('./')) {
							el.setAttribute('src', src.slice(1))
						}
					},
				})
			const result = rewriter.transform(render)
			return new Response(result, {
				headers: {
					'content-type': 'text/html',
				},
			})
		},
		// '/:slug': async (req) => {
		// 	const { slug } = req.params ?? {}

		// 	if (!slug) {
		// 		return new Response('slug is required', { status: 400 })
		// 	}

		// 	console.log(resolve(PUBLIC_DIR, slug))

		// 	const md_file = file(resolve(CONTENT_DIR, `${slug}.md`))
		// 	const md_exists = await md_file.exists()
		// 	const static_file = file(resolve(PUBLIC_DIR, slug))
		// 	const static_bytes = await static_file.bytes()
		// 	const static_exists = await static_file.exists()

		// 	if (md_exists) {
		// 		const text = await md_file.text()
		// 		const parsed = matter(text)
		// 		const { data: frontmatter, content } = parsed
		// 		const html = marked(content)
		// 		const layout = frontmatter.layout
		// 			? `${(frontmatter.layout as string).toLowerCase()}.html`
		// 			: DEFAULT_LAYOUT
		// 		const render = njk.render(layout, {
		// 			content: html,
		// 			description: site.description,
		// 			locale: site.locale,
		// 			site_name: site.name,
		// 			title: frontmatter.title ?? '',
		// 		})
		// 		const rewriter = new HTMLRewriter()
		// 			.on('[rel="icon"]', {
		// 				element(el) {
		// 					const href = el.getAttribute('href')
		// 					console.log(href)
		// 					if (href?.startsWith('/')) {
		// 						el.setAttribute('href', `.${href}`)
		// 					}
		// 				},
		// 			})
		// 			.on('img', {
		// 				element(el) {
		// 					const src = el.getAttribute('src')
		// 					console.log(src)
		// 					if (src?.startsWith('./')) {
		// 						el.setAttribute('src', src.slice(1))
		// 					}
		// 				},
		// 			})
		// 		const result = rewriter.transform(render)

		// 		return new Response(result, {
		// 			headers: {
		// 				'content-type': 'text/html',
		// 			},
		// 		})
		// 	} else if (static_exists) {
		// 		return new Response(static_bytes, {
		// 			headers: {
		// 				'Content-Type': static_file.type,
		// 			},
		// 		})
		// 	} else {
		// 		return new Response('404 not found', { status: 404 })
		// 	}

		// 	// return new Response(`Hello ${slug}`)
		// },
	},
})

console.log(`Listening on ${server.url}`)

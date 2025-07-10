import nunjucks from 'nunjucks'
import { TEMPLATE_DIR } from './constants'
import type { Page } from './types'

const njk = nunjucks.configure(TEMPLATE_DIR, {
	autoescape: false,
})

// TODO: Bun.HTMLRewriter

export const render = (template: string, data: Page) =>
	njk.render(template, data)

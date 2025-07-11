import { watch } from 'node:fs/promises'

const watcher = watch(import.meta.dir)

for await (const event of watcher) {
	console.log(`Detected ${event.eventType} in ${event.filename}`)
}

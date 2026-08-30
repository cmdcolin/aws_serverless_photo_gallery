import { scanAll } from '../lib/dynamo.js'
import { jsonHandler } from '../lib/http.js'

export const handler = jsonHandler(async () => ({
  Items: await scanAll(process.env.GuestbookTable),
}))

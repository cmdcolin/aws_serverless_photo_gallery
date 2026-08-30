export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

function json(statusCode, body, cacheControl) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...(cacheControl ? { 'cache-control': cacheControl } : {}),
    },
    body: JSON.stringify(body),
  }
}

// wraps a handler that just returns its JSON payload, so every function shares
// one error-to-status-code translation. cacheControl is only applied to the 200,
// so a failure is never the response a browser keeps
export function jsonHandler(fn, { cacheControl } = {}) {
  return async event => {
    try {
      return json(200, await fn(event), cacheControl)
    } catch (e) {
      console.error(e)
      return e instanceof HttpError
        ? json(e.statusCode, { message: e.message })
        : json(500, { message: `${e}` })
    }
  }
}

export function getHeader(event, name) {
  const key = Object.keys(event.headers).find(
    header => header.toLowerCase() === name,
  )
  return key ? event.headers[key] : undefined
}

export function parseJsonBody(event) {
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  try {
    return JSON.parse(body)
  } catch {
    throw new HttpError(400, 'request body is not valid JSON')
  }
}

// every field these endpoints accept is text, so coerce here rather than
// trusting a JSON body to have sent the right type into a DynamoDB key
export function requireTextFields(data, names) {
  const fields = data ?? {}
  const missing = names.filter(name => !fields[name])
  if (missing.length) {
    throw new HttpError(400, `missing required fields: ${missing.join(', ')}`)
  }
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, `${value}`]),
  )
}

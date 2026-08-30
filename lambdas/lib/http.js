export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// wraps a handler that just returns its JSON payload, so every function shares
// one error-to-status-code translation
export function jsonHandler(fn) {
  return async event => {
    try {
      return json(200, await fn(event))
    } catch (e) {
      console.error(e)
      return e instanceof HttpError
        ? json(e.statusCode, { message: e.message })
        : json(500, { message: `${e}` })
    }
  }
}

export function requireFields(data, names) {
  const fields = data ?? {}
  const missing = names.filter(name => !fields[name])
  if (missing.length) {
    throw new HttpError(400, `missing required fields: ${missing.join(', ')}`)
  }
  return fields
}

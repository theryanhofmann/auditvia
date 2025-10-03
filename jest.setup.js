// Jest setup for integration tests
const { fetch, Headers, Request, Response, FormData } = require('undici')

console.log('🔧 Jest setup: Overriding global.fetch with undici')

// Override global fetch with undici for reliable localhost connections
global.fetch = fetch
global.Headers = Headers
global.Request = Request
global.Response = Response
global.FormData = FormData

console.log('✅ Jest setup: global.fetch is now:', typeof global.fetch)


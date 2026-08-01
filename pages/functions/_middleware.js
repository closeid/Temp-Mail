const API_PATHS = [
    "/api/",
];

const HTML_CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://telegram.org",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' blob: https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

const withSecurityHeaders = (response) => {
    const secured = new Response(response.body, response);
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    if (secured.headers.get('content-type')?.toLowerCase().includes('text/html')) {
        secured.headers.set('Content-Security-Policy', HTML_CONTENT_SECURITY_POLICY);
    }
    return secured;
};

export async function onRequest(context) {
    const reqPath = new URL(context.request.url).pathname;
    if (API_PATHS.map(path => reqPath.startsWith(path)).some(Boolean)) {
        const response = withSecurityHeaders(await context.env.BACKEND.fetch(context.request));
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    return withSecurityHeaders(await context.next());
}

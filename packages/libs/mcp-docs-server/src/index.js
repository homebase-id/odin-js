/* eslint-env node */
import http from 'http';
import https from 'https';

// Configuration from environment
const PORT = Number(process.env.PORT || 4000);
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'homebase-id';
const GITHUB_REPO = process.env.GITHUB_REPO || 'odin-js';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'mcp-llm-doc-creation';

// Known docs files in docs/llm directory
const KNOWN_DOCS = [
  'WORKSPACE_INSTRUCTIONS.md',
  'ARCHITECTURE.md',
  'CODE_MAP.md',
  'RUNBOOK.md',
  'GLOSSARY.md',
  'README.md',
];

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(filename) {
  return `${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/docs/llm/${filename}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.content;
}

function setCache(key, content) {
  cache.set(key, {
    content,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function getGitHubRawUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/docs/llm/${filename}`;
}

function fetchFromGitHub(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 404) {
          reject(new Error('not_found'));
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`GitHub returned ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function getDocContent(filename) {
  const cacheKey = getCacheKey(filename);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from GitHub
  const url = getGitHubRawUrl(filename);
  const content = await fetchFromGitHub(url);

  // Cache it
  setCache(cacheKey, content);

  return content;
}

function jsonResponse(res, body, status = 200) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8'),
  });
  res.end(payload);
}

function textResponse(res, body, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // List docs endpoint
    if (url.pathname === '/mcp/docs' && req.method === 'GET') {
      const docs = KNOWN_DOCS.map((name) => ({
        name,
        path: `/mcp/docs/${encodeURIComponent(name)}`,
        url: getGitHubRawUrl(name),
      }));
      return jsonResponse(res, { docs });
    }

    // Get specific doc endpoint
    if (url.pathname.startsWith('/mcp/docs/') && req.method === 'GET') {
      const filename = decodeURIComponent(url.pathname.replace('/mcp/docs/', ''));

      // Security: only allow known docs
      if (!KNOWN_DOCS.includes(filename)) {
        return jsonResponse(
          res,
          {
            error: 'not_found',
            message: `Document ${filename} not found in known docs list`,
          },
          404
        );
      }

      try {
        const content = await getDocContent(filename);
        return textResponse(res, content);
      } catch (err) {
        if (err.message === 'not_found') {
          return jsonResponse(
            res,
            {
              error: 'not_found',
              message: `Document ${filename} not found on GitHub`,
            },
            404
          );
        }
        throw err;
      }
    }

    // Manifest endpoint
    if (url.pathname === '/mcp/manifest' && req.method === 'GET') {
      return jsonResponse(res, {
        id: 'mcp-docs-server-network',
        title: 'Odin.js Documentation (Network)',
        description: `Documentation fetched from GitHub ${GITHUB_OWNER}/${GITHUB_REPO}`,
        source: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
        branch: GITHUB_BRANCH,
        docsEndpoint: '/mcp/docs',
        availableDocs: KNOWN_DOCS,
      });
    }

    // Root endpoint
    if (url.pathname === '/' && req.method === 'GET') {
      const body = `MCP Docs Server (Network-Based)

Available docs:
${KNOWN_DOCS.map((name) => `- ${name} -> /mcp/docs/${name}`).join('\n')}

Endpoints:
- GET /mcp/docs - list all docs
- GET /mcp/docs/:filename - get specific doc
- GET /mcp/manifest - server manifest

Source: https://github.com/$\{GITHUB_OWNER\}/$\{GITHUB_REPO\}/tree/$\{GITHUB_BRANCH\}/docs/llm
`;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(body);
      return;
    }

    // 404 for everything else
    jsonResponse(
      res,
      {
        error: 'not_found',
        message: 'Unknown endpoint. Try GET /mcp/docs or GET /mcp/manifest',
      },
      404
    );
  } catch (err) {
    console.error('Server error:', err);
    jsonResponse(
      res,
      {
        error: 'server_error',
        message: String(err.message || err),
      },
      500
    );
  }
});

server.listen(PORT, () => {
  console.log(`MCP Docs Server (Network) listening on http://localhost:${PORT}`);
  console.log(
    `Fetching docs from: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/docs/llm`
  );
  console.log(`Cache TTL: ${CACHE_TTL_MS / 1000}s`);
});

const ALLOWED_SHARE_HOST = "dsanying.lanzoue.com"
const CORS_ORIGIN = "https://dsanying.github.io"
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
const ACW_XOR_KEY = "3000176000856006061501533003690027800375"
const ACW_POSITIONS = [
  15, 35, 29, 24, 33, 16, 1, 38, 10, 9, 19, 31, 40, 27, 22, 23, 25, 13, 6,
  11, 39, 18, 20, 8, 14, 21, 32, 26, 2, 30, 7, 4, 17, 5, 3, 28, 34, 37, 12,
  36,
]

function responseHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  }
}

export function parseShareUrl(value) {
  let url

  try {
    url = new URL(value)
  } catch {
    throw new Error("下载链接无效")
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_SHARE_HOST) {
    throw new Error("仅支持本站蓝奏云文件")
  }

  if (!/^\/[a-zA-Z0-9]+$/.test(url.pathname)) {
    throw new Error("蓝奏云文件标识无效")
  }

  url.search = ""
  url.hash = ""
  return url
}

export function createAcwCookie(html) {
  const arg = html.match(/var\s+arg1=['"]([A-Fa-f0-9]{40})['"]/)?.[1]

  if (!arg) {
    return ""
  }

  const reordered = Array(40)
  for (let sourceIndex = 0; sourceIndex < arg.length; sourceIndex += 1) {
    const destinationIndex = ACW_POSITIONS.indexOf(sourceIndex + 1)
    reordered[destinationIndex] = arg[sourceIndex]
  }

  let cookie = ""
  const value = reordered.join("")
  for (let index = 0; index < value.length; index += 2) {
    const left = Number.parseInt(value.slice(index, index + 2), 16)
    const right = Number.parseInt(ACW_XOR_KEY.slice(index, index + 2), 16)
    cookie += (left ^ right).toString(16).padStart(2, "0")
  }

  return `acw_sc__v2=${cookie}`
}

function extractRequired(html, pattern, label) {
  const value = html.match(pattern)?.[1]
  if (!value) {
    throw new Error(`无法读取蓝奏云${label}`)
  }
  return value
}

async function fetchText(url, init) {
  const response = await fetch(url, {
    redirect: "follow",
    ...init,
    headers: {
      "User-Agent": MOBILE_USER_AGENT,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`蓝奏云请求失败（${response.status}）`)
  }

  if (response.headers.get("Content-Encoding") === "gzip" && response.body) {
    return new Response(
      response.body.pipeThrough(new DecompressionStream("gzip")),
    ).text()
  }

  return response.text()
}

export async function resolveLanzouDownload(shareUrl) {
  let shareHtml = await fetchText(shareUrl)
  const cookie = createAcwCookie(shareHtml)

  if (cookie) {
    shareHtml = await fetchText(shareUrl, { headers: { Cookie: cookie } })
  }

  const fileName = extractRequired(
    shareHtml,
    /<title>([^<]+?)(?:\s+-\s+蓝奏云网盘)?<\/title>/i,
    "文件名",
  ).trim()
  const mobilePath = extractRequired(
    shareHtml,
    /<a[^>]+href=["'](\/tp\/[^"']+)["'][^>]+id=["']downurl["']/i,
    "下载页面",
  ).replaceAll("&amp;", "&")
  const mobileUrl = new URL(mobilePath, shareUrl)
  const mobileHtml = await fetchText(mobileUrl, {
    headers: { Cookie: cookie, Referer: shareUrl.toString() },
  })
  const downloadBase = extractRequired(
    mobileHtml,
    /var\s+vkjxld\s*=\s*['"]([^'"]+)['"]/,
    "下载域名",
  )
  const downloadToken = extractRequired(
    mobileHtml,
    /var\s+hyggid\s*=\s*['"]([^'"]+)['"]/,
    "下载令牌",
  )
  const gatewayUrl = new URL(downloadToken, downloadBase)
  const gatewayResponse = await fetch(gatewayUrl, {
    redirect: "manual",
    headers: {
      Referer: mobileUrl.toString(),
      "User-Agent": MOBILE_USER_AGENT,
    },
  })
  const location = gatewayResponse.headers.get("Location")
  if (gatewayResponse.status < 300 || gatewayResponse.status >= 400 || !location) {
    throw new Error("蓝奏云暂时没有返回下载地址")
  }

  const downloadUrl = new URL(location, gatewayUrl)
  if (downloadUrl.protocol !== "https:") {
    throw new Error("蓝奏云返回了不受信任的下载地址")
  }

  return { downloadUrl, fileName }
}

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url)

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: responseHeaders({
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }),
      })
    }

    if (request.method !== "GET" || requestUrl.pathname !== "/download") {
      return Response.json(
        { ok: true, service: "CUHKSZ course resource download resolver" },
        { headers: responseHeaders() },
      )
    }

    try {
      const shareUrl = parseShareUrl(requestUrl.searchParams.get("url") || "")
      const { downloadUrl, fileName } = await resolveLanzouDownload(shareUrl)
      const fileResponse = await fetch(downloadUrl, {
        headers: { "User-Agent": MOBILE_USER_AGENT },
      })

      if (!fileResponse.ok || !fileResponse.body) {
        throw new Error(`文件下载失败（${fileResponse.status}）`)
      }

      const headers = responseHeaders({
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Type":
          fileResponse.headers.get("Content-Type") || "application/octet-stream",
      })
      const contentLength = fileResponse.headers.get("Content-Length")
      if (contentLength) {
        headers["Content-Length"] = contentLength
      }

      return new Response(fileResponse.body, { headers })
    } catch (error) {
      const message = error instanceof Error ? error.message : "下载解析失败"
      return Response.json(
        { ok: false, message },
        { status: 502, headers: responseHeaders() },
      )
    }
  },
}

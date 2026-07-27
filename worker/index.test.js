import assert from "node:assert/strict"
import test from "node:test"

import { createAcwCookie, parseShareUrl } from "./index.js"

test("only accepts file links from the repository Lanzou host", () => {
  assert.equal(
    parseShareUrl("https://dsanying.lanzoue.com/iRIO73vhjd8h?ignored=1").href,
    "https://dsanying.lanzoue.com/iRIO73vhjd8h",
  )
  assert.throws(() => parseShareUrl("https://example.com/iRIO73vhjd8h"))
  assert.throws(() => parseShareUrl("https://dsanying.lanzoue.com/folder/file"))
})

test("solves the current Lanzou anti-bot cookie challenge", () => {
  const html = "<script>var arg1='BCE3C26E61D15E54C498EC35B6F75D2F0DAEAEEF'</script>"
  assert.equal(
    createAcwCookie(html),
    "acw_sc__v2=6a5513de16179fc5b338e5dddef5a463eb67d96b",
  )
})

test("does not invent a cookie for a normal page", () => {
  assert.equal(createAcwCookie("<html></html>"), "")
})

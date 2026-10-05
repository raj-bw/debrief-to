# Temporary: which Seaway News feed is current? Read-only, one request at a time.
import re, time, urllib.request, urllib.error
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
B = "https://www.cornwallseawaynews.com"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.geturl(), r.headers, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, e.headers, e.read().decode("utf-8", "replace")
    except Exception as e:
        return 0, url, {}, str(e)
for path in ["/category/local/feed/", "/local/feed/", "/category/regional/feed/", "/category/community/feed/",
             "/?cat=19,30&feed=rss2", "/?feed=rss2", "/feed/?nocache=1", "/feed/atom/", "/category/local/feed/?paged=2"]:
    time.sleep(2)
    st, final, h, body = get(B + path)
    items = re.findall(r"<item>(.*?)</item>", body, re.S)
    print(f"\n### {path} -> {st} {h.get('content-type','') if h else ''} {len(body)}B items={len(items)}" + (f" (ended at {final})" if final != B + path else ""))
    if h: print("  cache:", {k: h.get(k) for k in ["cache-control", "age", "x-cache", "cf-cache-status", "last-modified", "x-litespeed-cache", "x-proxy-cache"] if h.get(k)})
    print("  lastBuildDate:", re.findall(r"<lastBuildDate>([^<]+)", body)[:1])
    for it in items[:5]:
        t = re.findall(r"<title>(.*?)</title>", it, re.S); d = re.findall(r"<pubDate>(.*?)</pubDate>", it); l = re.findall(r"<link>(.*?)</link>", it)
        cats = re.findall(r"<category><!\[CDATA\[(.*?)\]\]></category>", it)
        print("   ", d[:1], (t[:1] or [""])[0][:80], l[:1], cats[:4])

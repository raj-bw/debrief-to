# Temporary: is Seaway News still publishing, and where? Read-only, one request at a time.
import json, re, time, urllib.request, urllib.error
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
B = "https://www.cornwallseawaynews.com"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-CA,en;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.geturl(), r.headers.get("content-type", ""), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, e.headers.get("content-type", ""), e.read().decode("utf-8", "replace")
    except Exception as e:
        return 0, url, "", str(e)

def show(title, url):
    time.sleep(2)
    st, final, ct, body = get(url)
    print(f"\n### {title}\n{url} -> {st} {ct} {len(body)}B" + (f" (ended at {final})" if final != url else ""))
    return st, body

st, home = show("Homepage", B + "/")
for sig in ["vmcdn", "Village Media", "wp-content", "wp-json", "icimedias", "ICI Médias", "Groupe", "Metroland", "townnews", "Postmedia"]:
    if sig.lower() in home.lower(): print("  mentions:", sig)
print("  generator:", re.findall(r'<meta[^>]+name="generator"[^>]*>', home)[:3])
print("  feed links:", re.findall(r'<link[^>]+type="application/(?:rss|atom)\+xml"[^>]*>', home)[:6])
print("  copyright:", re.findall(r'(?:©|&copy;|Copyright)[^<]{0,120}', home)[:3])
dates = re.findall(r'datetime="([^"]+)"', home)
print("  <time> dates on page (newest 10):", sorted(set(dates), reverse=True)[:10])
links = []
for m in re.finditer(r'href="(https?://www\.cornwallseawaynews\.com/[a-z\-]+/[a-z0-9\-]{12,}/)"', home):
    if m.group(1) not in links: links.append(m.group(1))
print("  story links on homepage:", len(links)); [print("   ", l) for l in links[:12]]

st, feed = show("RSS /feed/", B + "/feed/")
print("  lastBuildDate:", re.findall(r"<lastBuildDate>([^<]+)", feed)[:1])
for it in re.findall(r"<item>(.*?)</item>", feed, re.S)[:8]:
    t = re.findall(r"<title>(.*?)</title>", it, re.S); d = re.findall(r"<pubDate>(.*?)</pubDate>", it); l = re.findall(r"<link>(.*?)</link>", it)
    print("   ", d[:1], (t[:1] or [""])[0][:90], l[:1])

st, api = show("WordPress API, newest posts", B + "/wp-json/wp/v2/posts?per_page=10&_fields=date,link,title,categories")
try:
    for p in json.loads(api): print("   ", p["date"], p["title"]["rendered"][:90], p["link"])
except Exception as e: print("  not JSON:", api[:200].replace("\n", " "))

st, cats = show("WordPress categories", B + "/wp-json/wp/v2/categories?per_page=50&orderby=count&order=desc&_fields=id,slug,count")
print(" ", cats[:1500])

st, robots = show("robots.txt", B + "/robots.txt")
print(" ", robots[:800])
for sm in re.findall(r"(?i)sitemap:\s*(\S+)", robots)[:3]:
    st, body = show("sitemap " + sm, sm)
    print("  lastmods (newest 5):", sorted(re.findall(r"<lastmod>([^<]+)", body), reverse=True)[:5])
    print("  locs:", re.findall(r"<loc>([^<]+)", body)[:8])

for path in ["/local/", "/categorie_archives/seaway-news/", "/news/"]:
    st, page = show("Section " + path, B + path)
    print("  <time> dates (newest 6):", sorted(set(re.findall(r'datetime="([^"]+)"', page)), reverse=True)[:6])

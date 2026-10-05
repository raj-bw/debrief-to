# Where did five Postmedia papers go, and which WordPress category on the
# sister site carries them? Read-only; a few requests per paper, spaced out.
import json, re, time, urllib.request, urllib.parse, ssl, socket
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def get(url, accept="*/*", timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(400000)
            return r.status, r.geturl(), r.headers.get("content-type", ""), body, round(time.time() - t, 1)
    except urllib.error.HTTPError as e:
        return e.code, url, e.headers.get("content-type", ""), e.read(2000), round(time.time() - t, 1)
    except Exception as e:
        return 0, url, "", str(e).encode(), round(time.time() - t, 1)

for d in ["midnorthmonitor.com", "northernnews.ca", "theobserver.ca", "simcoereformer.ca", "brantfordexpositor.ca"]:
    print(f"\n===== {d}")
    s, final, ct, body, t = get(f"https://www.{d}/")
    print(f"home  -> {s} {final} ({t}s)")
    s2, f2, ct2, b2, t2 = get(f"https://www.{d}/feed", "application/rss+xml, application/xml, text/xml, */*")
    print(f"feed  -> {s2} {ct2} {f2} ({t2}s) starts: {b2[:90]!r}")
    host = urllib.parse.urlparse(final).netloc
    path = urllib.parse.urlparse(final).path.strip("/")
    slug = path.split("/")[0] if path else ""
    api = f"https://{host}"
    # the paper's own WordPress API, if it still has one
    s3, f3, _, b3, _ = get(f"https://www.{d}/wp-json/wp/v2/posts?per_page=2&_fields=date_gmt,link", "application/json")
    print(f"own wp-json -> {s3} {f3} {b3[:160]!r}")
    if slug:
        time.sleep(1)
        s4, _, _, b4, _ = get(f"{api}/wp-json/wp/v2/categories?slug={slug}&_fields=id,slug,name,count,parent", "application/json")
        print(f"{api} category '{slug}' -> {s4} {b4[:300]!r}")
        try:
            cats = json.loads(b4)
            for c in cats:
                time.sleep(1)
                s5, _, _, b5, _ = get(f"{api}/wp-json/wp/v2/posts?categories={c['id']}&per_page=5&_fields=date_gmt,link,title", "application/json")
                posts = json.loads(b5) if s5 == 200 else []
                print(f"   posts in category {c['id']}: {s5}, {len(posts)} shown")
                for p in posts[:5]:
                    print(f"     {p.get('date_gmt')}  {p.get('link')}")
        except Exception as e:
            print("   (could not read categories)", e)
    time.sleep(2)

print("\n===== Wingham Advance Times (midwesternnewspapers.com), as a browser")
try: print("DNS:", socket.gethostbyname_ex("www.midwesternnewspapers.com"))
except Exception as e: print("DNS failed:", e)
for u in ["https://www.midwesternnewspapers.com/", "https://midwesternnewspapers.com/", "http://www.midwesternnewspapers.com/", "https://www.midwesternnewspapers.com/feed"]:
    s, f, ct, b, t = get(u, timeout=40)
    title = re.search(rb"<title>(.*?)</title>", b, re.S)
    print(f"{u} -> {s} {f} {ct} ({t}s) {title.group(1)[:80] if title else b[:80]!r}")

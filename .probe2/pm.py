# 1. North Bay Nugget and Timmins Daily Press: news category on their WordPress API.
# 2. Quinte News, Bayshore Broadcasting, Orangeville Citizen: can a request
#    return more than the feed's 10 stories? (RSS page 2, WordPress API)
# Asked slowly: Postmedia refuses quick bursts.
import json, time, urllib.request, re
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=25) as r: return r.status, r.read(600000)
    except urllib.error.HTTPError as e: return e.code, b""
    except Exception as e: return 0, str(e).encode()
for host in ["www.nugget.ca", "www.timminspress.com"]:
    print(f"\n===== {host}")
    s, b = get(f"https://{host}/wp-json/wp/v2/categories?slug=news&_fields=id,slug,name,count")
    print("news category:", s, b[:200])
    try:
        cid = json.loads(b)[0]["id"]
        time.sleep(10)
        s, b = get(f"https://{host}/wp-json/wp/v2/posts?categories={cid}&per_page=6&_fields=date_gmt,link,title")
        posts = json.loads(b) if s == 200 else []
        own = [p for p in posts if host.replace("www.", "") in p["link"]]
        print(f"category {cid}: {s}, {len(posts)} posts, {len(own)} on {host}")
        for p in posts: print(f"   {p['date_gmt']}  {p['link'][:100]} | {p['title']['rendered'][:50]}")
    except Exception as e: print("   could not read:", e)
    time.sleep(15)
for site in ["https://www.quintenews.com", "https://www.bayshorebroadcasting.ca", "https://citizen.on.ca"]:
    print(f"\n===== {site}")
    for path in ["/feed", "/feed/?paged=2"]:
        s, b = get(site + path, "application/rss+xml, application/xml, */*")
        dates = re.findall(rb"<pubDate>(.*?)</pubDate>", b)
        print(f"{path}: {s}, {len(dates)} items, newest {dates[0][:25] if dates else '-'}, oldest {dates[-1][:25] if dates else '-'}")
        time.sleep(3)
    s, b = get(site + "/wp-json/wp/v2/posts?per_page=30&_fields=date_gmt,link")
    try:
        posts = json.loads(b); print(f"wp-json per_page=30: {s}, {len(posts)} posts, {posts[0]['date_gmt']} back to {posts[-1]['date_gmt']}")
    except Exception: print(f"wp-json: {s} {b[:80]!r}")
    time.sleep(3)

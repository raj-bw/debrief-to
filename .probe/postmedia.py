# Which category on each paper's own WordPress API holds its local news?
import json, time, urllib.request
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def getj(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, None
    except Exception as e: return 0, str(e)
# Chatham Daily News is the known-good example: category 7, "news"
for host in ["www.northernnews.ca", "www.theobserver.ca", "www.simcoereformer.ca", "www.brantfordexpositor.ca", "www.chathamdailynews.ca"]:
    print(f"\n===== {host}")
    s, cats = getj(f"https://{host}/wp-json/wp/v2/categories?slug=news,local-news,local&_fields=id,slug,name,count,parent")
    print("named categories:", s, cats)
    time.sleep(1)
    s, top = getj(f"https://{host}/wp-json/wp/v2/categories?per_page=15&orderby=count&order=desc&_fields=id,slug,name,count,parent")
    print("busiest categories:", [(c["id"], c["slug"], c["count"]) for c in top] if isinstance(top, list) else (s, top))
    for c in (cats if isinstance(cats, list) else []):
        time.sleep(1)
        s, posts = getj(f"https://{host}/wp-json/wp/v2/posts?categories={c['id']}&per_page=6&_fields=date_gmt,link,title")
        own = [p for p in (posts or []) if host.replace("www.", "") in p["link"]]
        print(f"  category {c['id']} '{c['slug']}': {s}, {len(posts or [])} posts, {len(own)} on {host}")
        for p in (posts or [])[:6]:
            print(f"     {p['date_gmt']}  {p['link'][:120]}  | {p['title']['rendered'][:60]}")
    time.sleep(2)

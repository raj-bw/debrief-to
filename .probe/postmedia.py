# Brantford Expositor's and Simcoe Reformer's news category, asked slowly
# (Postmedia refuses quick bursts with 403).
import json, time, urllib.request
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def getj(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, None
    except Exception as e: return 0, str(e)
time.sleep(20)
for host, known in [("www.brantfordexpositor.ca", None), ("www.simcoereformer.ca", 8)]:
    print(f"\n===== {host}")
    cid = known
    if cid is None:
        s, cats = getj(f"https://{host}/wp-json/wp/v2/categories?slug=news&_fields=id,slug,name,count")
        print("news category:", s, cats)
        cid = cats[0]["id"] if isinstance(cats, list) and cats else None
        time.sleep(8)
    if cid:
        s, posts = getj(f"https://{host}/wp-json/wp/v2/posts?categories={cid}&per_page=6&_fields=date_gmt,link,title")
        print(f"category {cid}: {s}, {len(posts or [])} posts")
        for p in (posts or []):
            print(f"   {p['date_gmt']}  {p['link'][:110]} | {p['title']['rendered'][:60]}")
    time.sleep(10)

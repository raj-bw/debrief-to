# Temporary, second pass: more candidates, category slugs, ownership and
# coverage notes, and whether shared-feed papers were filed under the wrong
# name in the live archive. One request at a time.
import re, time, json, urllib.request, urllib.error
from collections import Counter
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def get(url, accept="application/rss+xml,application/xml,text/html;q=0.9,*/*;q=0.8"):
    time.sleep(1.5)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.geturl(), r.headers.get("content-type", ""), r.read(3_000_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, "", ""
    except Exception as e:
        return 0, url, "", str(e)[:120]
def text(html):
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
def feed(name, url):
    st, final, ct, body = get(url)
    items = re.findall(r"<item[ >](.*?)</item>", body, re.S)
    dates = [m for it in items for m in re.findall(r"<pubDate>([^<]+)</pubDate>", it)[:1]]
    cats = Counter(c.strip() for it in items for c in re.findall(r"<category[^>]*>(?:<!\[CDATA\[)?([^<\]]+)", it))
    titles = [re.sub(r"<!\[CDATA\[|\]\]>", "", (re.findall(r"<title>(.*?)</title>", it, re.S) or [""])[0])[:70] for it in items[:4]]
    links = [(re.findall(r"<link>([^<]+)</link>", it) or [""])[0] for it in items]
    print(json.dumps({"name": name, "url": url, "status": st, "final": final if final != url else None, "items": len(items),
      "newest": dates[0] if dates else None, "oldest": dates[-1] if dates else None, "categories": cats.most_common(8),
      "titles": titles, "linkPrefixes": Counter("/".join(l.split("/")[3:4]) for l in links).most_common(6)}, ensure_ascii=False))
def say(name, url, pattern, n=6):
    st, final, ct, body = get(url)
    t = text(body)
    print(json.dumps({"name": name, "url": url, "status": st, "final": final if final != url else None,
      "matches": [m[:200] for m in re.findall(pattern, t, re.I)[:n]]}, ensure_ascii=False))

for n, u in [
  ("kawarthaNOW", "https://kawarthanow.com/feed/"),
  ("Today's Northumberland", "https://todaysnorthumberland.ca/feed/"),
  ("Lakefield Herald", "https://www.lakefieldherald.com/feed/"),
  ("North Dundas Times", "https://ndtimesnews.ca/feed/"),
  ("Essex Free Press ?feed=rss2", "https://www.essexfreepress.com/?feed=rss2"),
  ("Essex Free Press /rss", "https://www.essexfreepress.com/rss"),
  ("Essex Free Press joomla", "https://www.essexfreepress.com/index.php?format=feed&type=rss"),
  ("Midwestern page 2", "https://midwesternnewspapers.com/feed/?paged=2"),
  ("Midwestern page 3", "https://midwesternnewspapers.com/feed/?paged=3"),
  ("West Nipissing This Week p2", "https://westnipissing.com/feed/?paged=2"),
  ("CKNX News Today (ours)", "https://cknxnewstoday.ca/feed"),
  ("CK News Today (ours)", "https://cknewstoday.ca/feed"),
  ("Pembroke Today p2", "https://www.pembroketoday.ca/feed/?paged=2"),
]: feed(n, u)

st, _, _, body = get("https://midwesternnewspapers.com/wp-json/wp/v2/categories?per_page=50&_fields=id,slug,name,count", "application/json")
try: print(json.dumps({"name": "Midwestern categories", "status": st, "cats": [(c["id"], c["slug"], c["name"], c["count"]) for c in json.loads(body)]}, ensure_ascii=False))
except Exception: print(json.dumps({"name": "Midwestern categories", "status": st, "body": body[:200]}))

say("Essex Free Press home", "https://www.essexfreepress.com/", r"(?:generator|powered by|Joomla|WordPress|Wix|Squarespace)[^ ]{0,60}|[^.]{0,60}(?:Lakeshore|Kingsville|Tecumseh|Amherstburg)[^.]{0,60}")
say("Independent about", "https://petrolialambtonindependent.ca/about/", r"[^.]{0,120}(?:Petrolia|Oil Springs|Enniskillen|Brooke|Alvinston|Dawn|Euphemia|Wyoming|Warwick|Watford|Plympton|Central Lambton)[^.]{0,120}")
say("NewsNow about", "https://www.newsnowniagara.com/about/", r"[^.]{0,120}(?:Grimsby|Lincoln|Beamsville|Vineland|West Lincoln|Smithville|owned|publish)[^.]{0,120}")
say("Pembroke Today owner", "https://www.pembroketoday.ca/", r"[^.]{0,80}(?:©|copyright|owned by|a division of|Vista|My Broadcasting|Bell|Rogers|Stingray|Starboard|Evanov)[^.]{0,80}")
say("Napanee Today owner", "https://www.napaneetoday.ca/", r"[^.]{0,80}(?:©|copyright|owned by|a division of|Vista|My Broadcasting|Bell|Rogers|Stingray|Starboard|Evanov)[^.]{0,80}")
say("Haldimand Press article paywall", "https://haldimandpress.com/ground-broken-on-hospice-in-jarvis/", r"[^.]{0,80}(?:subscribe|subscriber|members only|log in to read|paywall|premium)[^.]{0,80}")
say("Wawa News about", "https://wawa-news.com/index.php/about/", r"[^.]{0,120}(?:Wawa|owned|publish|founded|editor)[^.]{0,120}")

# The live archive: did shared-feed papers get each other's stories?
for town in ["brant", "cobourg", "north-huron"]:
    st, _, _, body = get(f"https://debrief.to/api/feed?town={town}&range=month", "application/json")
    try:
        arts = json.loads(body)["articles"]
        mine = [a for a in arts if a["source"] in ("Paris Independent", "St. Marys Independent", "West Northumberland", "Wingham Advance Times")]
        print(json.dumps({"name": f"live archive: {town}", "status": st, "count": len(mine),
          "sample": [(a["source"], a["title"][:70], a["pubDate"][:10]) for a in mine[:12]]}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"name": f"live archive: {town}", "status": st, "error": str(e)[:100]}))

# Temporary: do the candidate newsrooms for regional-only towns have working,
# current feeds? One request at a time, a pause between, robots.txt read first.
import re, time, json, urllib.request, urllib.error
from urllib.parse import urlparse
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
def get(url):
    time.sleep(1.5)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/xml,text/html;q=0.9,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.geturl(), r.headers.get("content-type", ""), r.read(3_000_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, e.headers.get("content-type", ""), ""
    except Exception as e:
        return 0, url, "", str(e)[:120]
robots = {}
def disallowed(url):
    u = urlparse(url); host = f"{u.scheme}://{u.netloc}"
    if host not in robots:
        st, _, _, body = get(host + "/robots.txt")
        rules, on = [], False
        for line in (body if st == 200 else "").splitlines():
            l = line.split("#")[0].strip()
            if l.lower().startswith("user-agent:"): on = l.split(":", 1)[1].strip() == "*"
            elif on and l.lower().startswith("disallow:"):
                p = l.split(":", 1)[1].strip()
                if p: rules.append(p)
        robots[host] = rules
    return [r for r in robots[host] if (u.path or "/").startswith(r)]
def feed(name, url):
    st, final, ct, body = get(url)
    items = re.findall(r"<item[ >](.*?)</item>", body, re.S) or re.findall(r"<entry[ >](.*?)</entry>", body, re.S)
    dates = []
    for it in items:
        m = re.search(r"<pubDate>([^<]+)</pubDate>|<updated>([^<]+)</updated>|<published>([^<]+)</published>|<dc:date>([^<]+)</dc:date>", it)
        if m: dates.append(next(g for g in m.groups() if g))
    cats = {}
    for it in items:
        for c in re.findall(r"<category[^>]*>(?:<!\[CDATA\[)?([^<\]]+)", it): cats[c.strip()] = cats.get(c.strip(), 0) + 1
    gen = re.findall(r"<generator>([^<]+)</generator>", body)[:1]
    blocked = disallowed(final if st else url)
    first_title = re.findall(r"<title>(?:<!\[CDATA\[)?([^<\]]+)", items[0])[:1] if items else []
    links = [re.findall(r"<link>([^<]+)</link>", it)[:1] for it in items[:3]]
    print(json.dumps({"name": name, "url": url, "status": st, "final": final if final != url else None, "type": ct.split(";")[0],
      "items": len(items), "newest": dates[0] if dates else None, "oldest": dates[-1] if dates else None,
      "generator": gen, "topCategories": sorted(cats.items(), key=lambda x: -x[1])[:6], "firstTitle": first_title,
      "sampleLinks": [l[0] for l in links if l], "robotsDisallows": blocked}, ensure_ascii=False))
def page(name, url, pattern):
    st, final, ct, body = get(url)
    txt = re.sub(r"<[^>]+>", " ", body); txt = re.sub(r"\s+", " ", txt)
    hits = re.findall(pattern, txt, re.I)[:6]
    print(json.dumps({"name": name, "url": url, "status": st, "final": final if final != url else None, "matches": hits}, ensure_ascii=False))

C = [
 ("Haldimand Press", "https://haldimandpress.com/feed/"),
 ("Essex Free Press", "https://www.essexfreepress.com/feed/"),
 ("Windsor News Today", "https://windsornewstoday.ca/feed"),
 ("Sarnia News Today", "https://sarnianewstoday.ca/feed"),
 ("River Town Times (Wix)", "https://www.rivertowntimes.com/blog-feed.xml"),
 ("River Town Times (WP)", "https://www.rivertowntimes.com/feed/"),
 ("Southpoint Sun", "https://southpointsun.ca/feed/"),
 ("Frontenac News /feed", "https://frontenacnews.ca/feed/"),
 ("Frontenac News /rss.php", "https://frontenacnews.ca/rss.php"),
 ("Frontenac News /rss", "https://frontenacnews.ca/rss"),
 ("Wilmot-Tavistock Gazette", "https://wilmotpost.ca/feed/"),
 ("Wilmot-Tavistock Gazette (Wix)", "https://www.wilmotpost.ca/blog-feed.xml"),
 ("NewsNow Niagara", "https://www.newsnowniagara.com/feed/"),
 ("Midwestern Newspapers (all)", "https://midwesternnewspapers.com/feed/"),
 ("Listowel Banner", "https://midwesternnewspapers.com/category/listowel-banner/feed/"),
 ("Wingham Advance Times", "https://midwesternnewspapers.com/category/wingham-advance-times/feed/"),
 ("Independent Plus", "https://midwesternnewspapers.com/category/independent-plus/feed/"),
 ("Pembroke Today (VM)", "https://www.pembroketoday.ca/rss/local-news"),
 ("Pembroke Today (WP)", "https://www.pembroketoday.ca/feed/"),
 ("Napanee Today", "https://www.napaneetoday.ca/feed/"),
 ("Middlesex Banner", "https://middlesexbanner.ca/feed/"),
 ("Strathroy Today", "https://www.strathroytoday.ca/feed/"),
 ("My Kap-Hearst Now", "https://www.mykaphearstnow.com/feed/"),
 ("My West Nipissing Now", "https://www.mywestnipissingnow.com/feed/"),
 ("West Nipissing This Week", "https://westnipissing.com/feed/"),
 ("Sarnia Journal", "https://www.thesarniajournal.ca/feed/"),
 ("Grand Bend Bulletin", "https://grandbendbulletin.ca/feed/"),
 ("Meaford Independent", "https://themeafordindependent.ca/feed/"),
 ("Wawa News", "https://wawa-news.com/index.php/feed/"),
 ("Sioux Lookout Bulletin (Wix)", "https://www.siouxbulletin.com/blog-feed.xml"),
 ("Glengarry News", "https://www.glengarrynews.ca/feed/"),
 ("Kapuskasing Northern Times", "https://www.kapuskasingtimes.com/feed/"),
 ("Heart FM Woodstock", "https://www.heartfm.ca/feed/"),
 ("Angus News", "https://www.angusnews.ca/feed"),
 ("North Dundas Times", "https://ndtimes.ca/feed/"),
 ("Petawawa Post", "https://www.petawawapostlive.ca/feed/"),
 ("PETAWAWA.com", "https://petawawa.com/feed/"),
 ("Grant Haven (all papers)", "https://www.granthaven.com/blog-feed.xml"),
]
for n, u in C: feed(n, u)
page("The Independent: coverage", "https://petrolialambtonindependent.ca/about/", r"(?:Petrolia|Oil Springs|Enniskillen|Brooke|Alvinston|Dawn|Euphemia|Wyoming|Warwick|Watford|Plympton|Central Lambton)[^.]{0,80}")
page("Angus News: about", "https://www.angusnews.ca/", r"(?:about|owned|editor|publisher|Angus)[^.]{0,100}")
page("Glengarry News: home", "https://www.glengarrynews.ca/", r"(?:Glengarry|Alexandria)[^.]{0,80}")

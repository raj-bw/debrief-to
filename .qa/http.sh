#!/usr/bin/env bash
# Protocol, security-header, TLS, DNS, caching and API-robustness checks
# against the live site. Read-only; one request at a time.
B="${BASE:-https://debrief.to}"
HOST="${B#https://}"
UA="DebriefTO-QA/1.0 (+https://debrief.to)"
c() { curl -sS -A "$UA" --max-time 60 "$@"; }
H() { echo; echo "### $*"; }

H "Headers for /"
c -D - -o /dev/null "$B/"

H "OWASP Secure Headers checklist (/ and /api/feed)"
for path in "/" "/api/feed?town=newmarket&range=today"; do
  hdrs=$(c -D - -o /dev/null "$B$path" | tr -d '\r' | tr 'A-Z' 'a-z')
  echo "-- $path"
  for h in strict-transport-security content-security-policy x-content-type-options x-frame-options referrer-policy permissions-policy cross-origin-opener-policy; do
    if echo "$hdrs" | grep -q "^$h:"; then echo "PRESENT $h:$(echo "$hdrs" | grep "^$h:" | cut -d: -f2- | head -c 160)"; else echo "MISSING $h"; fi
  done
  echo "$hdrs" | grep -E "^(x-powered-by|server|access-control-allow-origin|cache-control|content-encoding|content-type|vary):" | sed 's/^/  /'
done

H "Redirects (HTTP -> HTTPS, www -> apex)"
for u in "http://$HOST/" "http://www.$HOST/" "https://www.$HOST/" "http://$HOST/?view=about" "https://$HOST/index.html"; do
  c -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "$u" || echo "$u -> failed"
done

H "Not found"
c -o /tmp/404.html -w "/this-page-does-not-exist -> %{http_code} %{content_type}\n" "$B/this-page-does-not-exist"
grep -o "<title>[^<]*</title>" /tmp/404.html | head -1
for p in /.env /.git/config /package.json /next.config.mjs /api /api/ /_next/ /wp-admin /api/feed/../../.env; do
  c -o /dev/null -w "$p -> %{http_code}\n" "$B$p"
done

H "robots.txt"
c "$B/robots.txt"
H "sitemap.xml"
c "$B/sitemap.xml" | tee /tmp/sitemap.xml; echo
xmllint --noout /tmp/sitemap.xml && echo "sitemap is well-formed XML"
H "manifest.webmanifest"
c "$B/manifest.webmanifest" | tee /tmp/manifest.json | head -c 2500; echo
H "Icons and share image"
for p in $(python3 -c "import json;print(' '.join(i['src'] for i in json.load(open('/tmp/manifest.json')).get('icons',[])))" 2>/dev/null) /icons/apple-touch-icon.png /icons/og-image.png /favicon.ico /.well-known/security.txt; do
  c -o /dev/null -w "$p -> %{http_code} %{content_type} %{size_download}B\n" "$B$p"
done

H "TLS"
for v in tls1 tls1_1 tls1_2 tls1_3; do
  if echo | timeout 15 openssl s_client -connect "$HOST:443" -servername "$HOST" -$v >/dev/null 2>&1; then echo "$v accepted"; else echo "$v refused"; fi
done
echo | openssl s_client -connect "$HOST:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null
c -o /dev/null -w "HTTP version: %{http_version}\n" "$B/"

H "DNS (mail for hello@$HOST, CAA)"
for t in A AAAA CAA MX TXT NS; do echo "$t: $(dig +short $t $HOST | tr '\n' ' ')"; done
echo "www CNAME: $(dig +short CNAME www.$HOST | tr '\n' ' ')"
echo "_dmarc TXT: $(dig +short TXT _dmarc.$HOST | tr '\n' ' ')"

H "Compression and caching"
for path in "/" "/api/feed?town=newmarket&range=today" "/api/council?town=newmarket"; do
  c -H "Accept-Encoding: br, gzip" -D - -o /dev/null "$B$path" | tr -d '\r' | grep -iE "^(content-encoding|cache-control|x-vercel-cache|age|etag):" | sed "s|^|$path  |"
done
asset=$(c "$B/" | grep -o '/_next/static/[^"]*\.js' | head -1)
echo "static asset: $asset"
c -D - -o /dev/null "$B$asset" | tr -d '\r' | grep -iE "^(cache-control|content-encoding):"

H "Speed from a GitHub runner (3 tries each)"
for path in "/" "/api/feed?town=newmarket&range=today" "/api/feed?town=newmarket&range=month" "/api/feed?town=toronto&range=week" "/api/council?town=newmarket"; do
  for i in 1 2 3; do
    c -H "Accept-Encoding: br, gzip" -o /dev/null -w "$path  ttfb=%{time_starttransfer}s total=%{time_total}s bytes=%{size_download} status=%{http_code}\n" "$B$path"
  done
done
echo "uncompressed month feed size: $(c "$B/api/feed?town=newmarket&range=month" | wc -c) bytes"

H "API robustness"
long=$(python3 -c "print('a'*6000)")
for q in "town=nonexistent-town" "range=bogus" "town=%3Cscript%3Ealert(1)%3C/script%3E" "town=$long" "town=newmarket&range=today&range=month" "town[]=x" "town=newmarket%00"; do
  c -o /tmp/r.json -w "/api/feed?${q:0:60} -> %{http_code} %{content_type} %{time_total}s\n" "$B/api/feed?$q"
  head -c 220 /tmp/r.json | tr '\n' ' '; echo
done
for q in "town=" "town=bogus" "town=toronto" "town=%3Cscript%3E"; do
  c -o /tmp/r.json -w "/api/council?$q -> %{http_code} %{time_total}s\n" "$B/api/council?$q"; head -c 200 /tmp/r.json; echo
done
c -o /dev/null -w "GET /api/deliver -> %{http_code}\n" "$B/api/deliver"
c -o /tmp/r.json -w "POST /api/deliver (no auth) -> %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"url":"x","xml":"y"}' "$B/api/deliver"; cat /tmp/r.json; echo
c -o /tmp/r.json -w "POST /api/deliver (wrong auth) -> %{http_code}\n" -X POST -H "Authorization: Bearer wrong" -d '{}' "$B/api/deliver"; cat /tmp/r.json; echo
c -o /tmp/r.json -w "GET /api/collect (no auth) -> %{http_code} %{time_total}s\n" "$B/api/collect"; head -c 300 /tmp/r.json; echo
c -o /tmp/r.json -w "GET /api/health?limit=0 -> %{http_code} %{time_total}s\n" "$B/api/health?limit=0"; head -c 300 /tmp/r.json; echo
for m in OPTIONS PUT DELETE TRACE PATCH; do c -o /dev/null -w "$m / -> %{http_code}\n" -X $m "$B/"; done
for m in POST PUT DELETE; do c -o /dev/null -w "$m /api/feed -> %{http_code}\n" -X $m "$B/api/feed"; done
echo "CORS for a foreign origin:"
c -D - -o /dev/null -H "Origin: https://evil.example" "$B/api/feed?town=newmarket&range=today" | tr -d '\r' | grep -i "^access-control" || echo "  (no CORS headers: other sites' scripts can't read the API from a browser)"

# /go/* is not requested here: every request is counted as a QR scan in
# the nightly stats. It is tested against a local copy instead.

H "www (added 4 Oct)"
c -D - -o /dev/null "https://www.$HOST/?view=about" | tr -d '\r' | grep -iE "^(HTTP|location|strict-transport-security):"
echo | openssl s_client -connect "www.$HOST:443" -servername "www.$HOST" 2>/dev/null | openssl x509 -noout -subject -dates -ext subjectAltName 2>/dev/null

H "Rate limit on the public feed check (one publisher, twice)"
c -o /tmp/h1.json -w "1st /api/health?limit=1 -> %{http_code}\n" "$B/api/health?limit=1"
c -D /tmp/h2.h -o /tmp/h2.json -w "2nd /api/health?limit=1 -> %{http_code}\n" "$B/api/health?limit=1"
grep -i "^retry-after" /tmp/h2.h; head -c 200 /tmp/h2.json; echo
c -o /dev/null -w "/api/verify-feeds?limit=1 -> %{http_code}\n" "$B/api/verify-feeds?limit=1"
c -o /dev/null -w "/api/verify-feeds?limit=1 again -> %{http_code}\n" "$B/api/verify-feeds?limit=1"

H "Can the image servers send smaller photos? (status, type, bytes)"
probe() { curl -sS -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/141 Safari/537.36" -e "https://debrief.to/" --max-time 30 -o /dev/null -w "%{http_code} %{content_type} %{size_download}B  $1\n" "$1" || echo "failed $1"; }
feed=$(c "$B/api/feed?town=toronto&range=week")
for host in vmcdn.ca i.cbc.ca storage.ghost.io bloximages; do
  url=$(echo "$feed" | python3 -c "import json,sys; a=json.load(sys.stdin)['articles']; u=[x['image'] for x in a if x.get('image') and '$host' in x['image']]; print(u[0] if u else '')")
  [ -z "$url" ] && { echo "no $host image in this week's Toronto feed"; continue; }
  echo "-- $host"
  probe "$url"
  case $host in
    vmcdn.ca) for w in 640 480 320; do probe "$(echo "$url" | sed -E "s/;w=[0-9]+/;w=$w/")"; done ;;
    i.cbc.ca) for w in 640 480; do probe "$(echo "$url" | sed -E "s#/full/max/#/full/$w,/#")"; done ;;
    storage.ghost.io) for w in 600 300; do probe "$(echo "$url" | sed -E "s#/content/images/(size/w[0-9]+/)?#/content/images/size/w$w/#")"; done ;;
    bloximages) for w in 640 480; do probe "$(echo "$url" | sed -E "s/resize=[0-9]+%2C[0-9]*/resize=$w%2C/")"; done ;;
  esac
done
# The one Lighthouse flagged: a 1.4 MB collage
probe "https://www.vmcdn.ca/f/files/torontotoday/images/food/photo-collagepng-6.png;w=960"
probe "https://www.vmcdn.ca/f/files/torontotoday/images/food/photo-collagepng-6.png;w=480"

H "Mozilla HTTP Observatory (developer.mozilla.org/observatory)"
obs=$(curl -sS -X POST --max-time 120 "https://observatory-api.mdn.mozilla.net/api/v2/scan?host=$HOST")
echo "$obs" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin); print('grade', d.get('grade'), '| score', d.get('score'), '| tests passed', d.get('tests_passed'), 'failed', d.get('tests_failed'), '| details', d.get('details_url'))
  if d.get('error'): print('error', d.get('error'), d.get('message'))
except Exception as e: print('unreadable:', e)
"

H "Qualys SSL Labs (ssllabs.com/ssltest)"
for i in $(seq 1 30); do
  r=$(curl -sS --max-time 60 "https://api.ssllabs.com/api/v3/analyze?host=$HOST&all=done$( [ $i = 1 ] && echo '&startNew=on' )")
  st=$(echo "$r" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null)
  [ "$st" = "READY" ] || [ "$st" = "ERROR" ] && break
  sleep 20
done
echo "$r" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin); print('status', d.get('status'), d.get('statusMessage',''))
  for e in d.get('endpoints',[]): print('  ', e.get('ipAddress'), 'grade', e.get('grade'), '| warnings', e.get('hasWarnings'), '|', e.get('statusMessage'))
except Exception as e: print('unreadable:', e)
"

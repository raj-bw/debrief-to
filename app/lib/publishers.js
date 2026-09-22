/* ---- Every local newsroom we carry, and the towns it serves ----
   One record per newsroom. `serves` comes from Raj's Ontario publisher
   research, corrected to the official municipality names; how each one is
   fetched was verified on 22 September 2026, by hand, one site at a time.

   How a newsroom reaches a reader (see towns.js):
     - serving three municipalities or fewer, it is each of those towns' own
       paper, and the tab carries the town's name;
     - serving more, it is the paper for an area, and the tab carries the
       area's name (`area`) — except in its `home` town, where it is simply
       the local paper.
   Naming a tab "Wawa" when what fills it is SooToday would overstate what
   the reader is getting. "Algoma District" doesn't.

   Fetching, one of:
     village   a Village Media site; they all share one feed layout
     urls      plain RSS, tried in order
     wp        the WordPress REST API, scoped to one category (Postmedia
               titles that have switched RSS off). categoryId was checked by
               hand; `category` is the slug to fall back on if it moves.
     blox      Metroland and Torstar's platform, asked for its news section

   `owner` is shown on the About page. Left blank where we haven't confirmed
   it, rather than guessed. `paywall` marks metered dailies, labelled "Sub"
   like the Toronto Star. ---- */

export const PUBLISHERS = [
  { name: "Aurora Today", village: "auroratoday.ca", owner: "Village Media", serves: ["Aurora"] },
  { name: "Burlington Today", village: "burlingtontoday.com", owner: "Village Media", serves: ["Burlington"] },
  { name: "Dundas Today", village: "dundastoday.com", owner: "Village Media", serves: ["Hamilton"] },
  { name: "Flamborough Today", village: "flamboroughtoday.com", owner: "Village Media", serves: ["Hamilton"] },
  { name: "EloraFergus Today", village: "elorafergustoday.com", owner: "Village Media", serves: ["Centre Wellington"] },
  { name: "Halton Hills Today", village: "haltonhillstoday.ca", owner: "Village Media", serves: ["Halton Hills"] },
  { name: "Milton Today", village: "miltontoday.ca", owner: "Village Media", serves: ["Milton"] },
  { name: "Pelham Today", village: "pelhamtoday.ca", owner: "Village Media", serves: ["Pelham"] },
  { name: "Stratford Today", village: "stratfordtoday.ca", owner: "Village Media", serves: ["Perth East", "Perth South", "Stratford"] },
  { name: "TBNewsWatch", village: "tbnewswatch.com", owner: "Village Media", home: "Thunder Bay", area: "Thunder Bay District", serves: ["Atikokan", "Conmee", "Dorion", "Gillies", "Greenstone", "Manitouwadge", "Neebing", "Nipigon", "O'Connor", "Oliver Paipoonge", "Red Rock", "Schreiber", "Shuniah", "Terrace Bay", "Thunder Bay"] },
  { name: "Barrie Today", village: "barrietoday.com", owner: "Village Media", serves: ["Barrie", "Springwater"] },
  { name: "Orillia Matters", village: "orilliamatters.com", owner: "Village Media", home: "Orillia", area: "Orillia and area", serves: ["Orillia", "Oro-Medonte", "Ramara", "Severn"] },
  { name: "Midland Today", village: "midlandtoday.ca", owner: "Village Media", home: "Midland", area: "North Simcoe", serves: ["Midland", "Penetanguishene", "Tay", "Tiny"] },
  { name: "Guelph Today", village: "guelphtoday.com", owner: "Village Media", serves: ["Guelph", "Guelph/Eramosa"] },
  { name: "BayToday", village: "baytoday.ca", owner: "Village Media", home: "North Bay", area: "Nipissing District", serves: ["Bonfield", "Chisholm", "East Ferris", "Nipissing", "North Bay", "Papineau-Cameron", "South Algonquin", "West Nipissing"] },
  { name: "Sudbury.com", village: "sudbury.com", owner: "Village Media", home: "Greater Sudbury", area: "Sudbury and area", serves: ["Baldwin", "Chapleau", "Espanola", "French River", "Greater Sudbury", "Killarney", "Nairn and Hyman", "Sables-Spanish Rivers", "St. Charles"] },
  { name: "Elliot Lake Today", village: "elliotlaketoday.com", owner: "Village Media", home: "Elliot Lake", area: "North Shore", serves: ["Blind River", "Elliot Lake", "Huron Shores", "North Shore", "Spanish", "Thessalon"] },
  { name: "SooToday", village: "sootoday.com", owner: "Village Media", home: "Sault Ste. Marie", area: "Algoma District", serves: ["Blind River", "Bruce Mines", "Dubreuilville", "Elliot Lake", "Hilton", "Hornepayne", "Huron Shores", "Jocelyn", "Johnson", "Laird", "Macdonald, Meredith", "North Shore", "Plummer Additional", "Prince", "Sault Ste. Marie", "Spanish", "St. Joseph", "Tarbutt", "Thessalon", "Wawa", "White River"] },
  { name: "TimminsToday", village: "timminstoday.com", owner: "Village Media", home: "Timmins", area: "Cochrane District", serves: ["Black River-Matheson", "Cochrane", "Fauquier-Strickland", "Iroquois Falls", "Kapuskasing", "Mattice-Val Côté", "Moonbeam", "Opasatika", "Smooth Rock Falls", "Timmins"] },
  { name: "Arnprior Today", urls: ["https://arnpriortoday.ca/feed"], serves: ["Arnprior", "McNab/Braeside"] },
  { name: "Aylmer Express", urls: ["https://aylmerexpress.com/feed"], serves: ["Aylmer", "Malahide"] },
  { name: "Bancroft This Week", urls: ["https://www.bancroftthisweek.com/feed"], home: "Bancroft", area: "North Hastings", serves: ["Carlow/Mayo", "Faraday", "Hastings Highlands", "Limerick", "South Algonquin", "Tudor and Cashel", "Bancroft"] },
  { name: "Bruce Peninsula Press", urls: ["https://brucepeninsulapress.com/feed"], serves: ["Northern Bruce Peninsula"] },
  { name: "Orangeville Citizen", urls: ["https://citizen.on.ca/feed"], area: "Dufferin County", serves: ["Amaranth", "East Garafraxa", "Grand Valley", "Melancthon", "Mono", "Mulmur"] },
  { name: "Shelburne Free Press", urls: ["https://shelburnefreepress.ca/feed"], serves: ["Shelburne"] },
  { name: "CK News Today", urls: ["https://cknewstoday.ca/feed"], owner: "Blackburn Media", serves: ["Chatham-Kent"] },
  { name: "CKNX News Today", urls: ["https://cknxnewstoday.ca/feed"], owner: "Blackburn Media", area: "Huron County", serves: ["Ashfield-Colborne-Wawanosh", "Bluewater", "Goderich", "Howick", "Huron East", "Huron-Kinloss", "North Huron", "South Huron"] },
  { name: "Seaway News", urls: ["https://www.cornwallseawaynews.com/feed/"], home: "Cornwall", area: "Stormont, Dundas and Glengarry", serves: ["Cornwall", "North Dundas", "North Glengarry", "North Stormont", "South Dundas", "South Glengarry", "South Stormont"] },
  { name: "Countylive", urls: ["https://www.countylive.ca/feed"], serves: ["Prince Edward"] },
  { name: "Eganville Leader", urls: ["https://www.eganvilleleader.ca/feed"], serves: ["Bonnechere Valley", "Killaloe, Hagarty, Richards", "North Algona Wilberforce"] },
  { name: "Exeter Lakeshore Times", urls: ["https://www.exetertoday.ca/feed"], serves: ["South Huron"] },
  { name: "Fort Frances Times", urls: ["https://fftimes.com/feed"], home: "Fort Frances", area: "Rainy River District", serves: ["Alberton", "Atikokan", "Chapple", "Dawson", "Emo", "Fort Frances", "La Vallee", "Lake of the Woods", "Morley", "Rainy River"] },
  { name: "Haliburton Echo", urls: ["https://haliburtonecho.ca/feed"], serves: ["Algonquin Highlands", "Haliburton", "Minden Hills"] },
  { name: "The Highlander", urls: ["https://thehighlander.ca/feed"], serves: ["Algonquin Highlands", "Haliburton", "Minden Hills"] },
  { name: "Kawartha411", urls: ["https://www.kawartha411.ca/feed"], serves: ["Kawartha Lakes"] },
  { name: "Manitoulin Expositor", urls: ["https://www.manitoulin.com/feed"], area: "Manitoulin Island", serves: ["Assiginack", "Billings", "Burpee and Mills", "Gordon/Barrie Island", "Gore Bay", "Northeastern Manitoulin", "Tehkummah"] },
  { name: "Wingham Advance Times", urls: ["https://www.midwesternnewspapers.com/feed"], serves: ["Howick", "North Huron"] },
  { name: "The Morrisburg Leader", urls: ["https://www.morrisburgleader.ca/feed"], serves: ["South Dundas"] },
  { name: "Niagara-on-the-Lake Local", urls: ["https://www.notllocal.com/rss"], serves: ["Niagara-on-the-Lake"] },
  { name: "Oakville News", urls: ["https://www.oakvillenews.org/rss"], serves: ["Oakville"] },
  { name: "Woolwich Observer", urls: ["https://observerxtra.com/feed"], serves: ["Woolwich"] },
  { name: "The Independent", urls: ["https://petrolialambtonindependent.ca/feed"], serves: ["Plympton-Wyoming", "Warwick"] },
  { name: "Quinte News", urls: ["https://www.quintenews.com/feed"], owner: "Quinte Broadcasting", home: "Belleville", area: "Quinte and Hastings", serves: ["Bancroft", "Belleville", "Carlow/Mayo", "Centre Hastings", "Deseronto", "Faraday", "Hastings Highlands", "Limerick", "Madoc", "Marmora and Lake", "Quinte West", "Stirling-Rawdon", "Tudor and Cashel", "Tweed", "Tyendinaga"] },
  { name: "Renfrew Today", urls: ["https://renfrewtoday.ca/feed"], serves: ["Renfrew"] },
  { name: "Wellington Advertiser", urls: ["https://www.wellingtonadvertiser.com/feed"], home: "Centre Wellington", area: "Wellington County", serves: ["Centre Wellington", "Erin", "Guelph", "Guelph/Eramosa", "Mapleton", "Minto", "Puslinch", "Wellington North"] },
  { name: "The Temiskaming Speaker", urls: ["https://northernontario.ca/feed", "https://northernontario.ca/rss"], home: "Temiskaming Shores", area: "Temiskaming", serves: ["Armstrong", "Brethour", "Casey", "Chamberlain", "Charlton and Dack", "Cobalt", "Englehart", "Evanturel", "Gauthier", "Harley", "Harris", "Hilliard", "Hudson", "James", "Kerns", "Kirkland Lake", "Larder Lake", "Latchford", "Matachewan", "McGarry", "Temiskaming Shores"] },
  { name: "Kingstonist", urls: ["https://www.kingstonist.com/feed", "https://www.kingstonist.com/rss"], home: "Kingston", area: "Kingston and Frontenac", serves: ["Central Frontenac", "Frontenac Islands", "Kingston", "North Frontenac", "South Frontenac"] },
  { name: "The Napanee Beaver", urls: ["https://napaneebeaver.ca/feed"], home: "Greater Napanee", area: "Lennox and Addington", serves: ["Addington Highlands", "Deseronto", "Greater Napanee", "Loyalist", "Stone Mills", "Tyendinaga"] },
  { name: "Your Kenora", urls: ["https://yourkenora.ca/feed"], home: "Kenora", area: "Kenora District", serves: ["Dryden", "Ear Falls", "Ignace", "Kenora", "Machin", "Pickle Lake", "Red Lake", "Sioux Lookout", "Sioux Narrows-Nestor Falls"] },
  { name: "Bayshore Broadcasting", urls: ["https://www.bayshorebroadcasting.ca/feed"], owner: "Bayshore Broadcasting", home: "Owen Sound", area: "Grey-Bruce", serves: ["Arran-Elderslie", "Brockton", "Chatsworth", "Georgian Bluffs", "Hanover", "Kincardine", "Northern Bruce Peninsula", "Owen Sound", "Saugeen Shores", "South Bruce", "South Bruce Peninsula", "Southgate", "West Grey"] },
  { name: "My Bancroft Now", urls: ["https://www.mybancroftnow.com/feed/"], owner: "My Broadcasting Corporation", serves: ["Bancroft"] },
  { name: "My Kemptville Now", urls: ["https://www.mykemptvillenow.com/feed/"], owner: "My Broadcasting Corporation", serves: ["North Grenville"] },
  { name: "My Parry Sound Now", urls: ["https://www.myparrysoundnow.com/feed/"], owner: "My Broadcasting Corporation", serves: ["Parry Sound"] },
  { name: "My Stratford Now", urls: ["https://www.mystratfordnow.com/feed/"], owner: "My Broadcasting Corporation", home: "Stratford", area: "Stratford and Perth County", serves: ["Perth East", "Perth South", "St. Marys", "Stratford", "West Perth"] },
  { name: "St. Marys Independent", urls: ["https://www.granthaven.com/blog-feed.xml"], owner: "Grant Haven Media", onlyCategories: ["St Marys", "St. Marys"], serves: ["St. Marys"] },
  { name: "Paris Independent", urls: ["https://www.granthaven.com/blog-feed.xml"], owner: "Grant Haven Media", onlyCategories: ["Paris Independent"], serves: ["Brant"] },
  { name: "West Northumberland", urls: ["https://www.granthaven.com/blog-feed.xml"], owner: "Grant Haven Media", onlyCategories: ["West Northumberland"], serves: ["Cobourg", "Port Hope"] },
  { name: "Brantford Expositor", urls: ["https://www.brantfordexpositor.ca/feed"], owner: "Postmedia", paywall: true, serves: ["Brant", "Brantford"] },
  { name: "Northern News", urls: ["https://www.northernnews.ca/feed"], owner: "Postmedia", paywall: true, home: "Kirkland Lake", area: "Kirkland Lake and area", serves: ["Gauthier", "Kirkland Lake", "Larder Lake", "Matachewan", "McGarry"] },
  { name: "North Bay Nugget", urls: ["https://www.nugget.ca/feed"], owner: "Postmedia", paywall: true, serves: ["North Bay"] },
  { name: "Ottawa Citizen", urls: ["https://www.ottawacitizen.com/feed"], owner: "Postmedia", paywall: true, serves: ["Ottawa"] },
  { name: "Sarnia Observer", urls: ["https://www.theobserver.ca/feed"], owner: "Postmedia", paywall: true, home: "Sarnia", area: "Sarnia-Lambton", serves: ["Dawn-Euphemia", "Plympton-Wyoming", "Point Edward", "Sarnia", "St. Clair", "Warwick"] },
  { name: "Simcoe Reformer", urls: ["https://www.simcoereformer.ca/feed"], owner: "Postmedia", paywall: true, serves: ["Norfolk", "Tillsonburg"] },
  { name: "Timmins Daily Press", urls: ["https://www.timminspress.com/feed"], owner: "Postmedia", paywall: true, serves: ["Timmins"] },
  { name: "Mid-North Monitor", urls: ["https://www.midnorthmonitor.com/feed"], owner: "Postmedia", serves: ["Espanola", "Sables-Spanish Rivers"] },
  { name: "Kingston Whig-Standard", wp: { api: "https://www.thewhig.com", categoryId: 5, category: "news" }, owner: "Postmedia", paywall: true, serves: ["Kingston"] },
  { name: "Windsor Star", wp: { api: "https://windsorstar.com", categoryId: 2382, category: "news" }, owner: "Postmedia", paywall: true, home: "Windsor", area: "Windsor-Essex", serves: ["Amherstburg", "Essex", "Pelee", "Tecumseh", "Windsor"] },
  { name: "London Free Press", wp: { api: "https://lfpress.com", categoryId: 12, category: "news" }, owner: "Postmedia", paywall: true, home: "London", area: "London and area", serves: ["Adelaide Metcalfe", "London", "Lucan Biddulph", "Strathroy-Caradoc", "Thames Centre"] },
  { name: "Goderich Signal-Star", wp: { api: "https://lfpress.com", categoryId: 5, category: "goderich" }, owner: "Postmedia", paywall: true, serves: ["Ashfield-Colborne-Wawanosh", "Bluewater", "Goderich"] },
  { name: "Clinton News-Record", wp: { api: "https://lfpress.com", categoryId: 6, category: "clinton" }, owner: "Postmedia", paywall: true, serves: ["Central Huron"] },
  { name: "Mitchell Advocate", wp: { api: "https://lfpress.com", categoryId: 7, category: "mitchell" }, owner: "Postmedia", paywall: true, serves: ["West Perth"] },
  { name: "Seaforth Huron Expositor", wp: { api: "https://lfpress.com", categoryId: 8, category: "seaforth-huron" }, owner: "Postmedia", paywall: true, serves: ["Huron East"] },
  { name: "Woodstock Sentinel-Review", wp: { api: "https://lfpress.com", categoryId: 9, category: "woodstock" }, owner: "Postmedia", paywall: true, home: "Woodstock", area: "Oxford County", serves: ["Blandford-Blenheim", "East Zorra-Tavistock", "Ingersoll", "Norwich", "South-West Oxford", "Tillsonburg", "Woodstock", "Zorra"] },
  { name: "St. Thomas Times-Journal", wp: { api: "https://lfpress.com", categoryId: 10, category: "st-thomas" }, owner: "Postmedia", paywall: true, home: "St. Thomas", area: "Elgin County", serves: ["Aylmer", "Bayham", "Central Elgin", "Dutton/Dunwich", "Malahide", "Southwold", "St. Thomas", "West Elgin"] },
  { name: "Strathroy Age Dispatch", wp: { api: "https://lfpress.com", categoryId: 11, category: "strathroy" }, owner: "Postmedia", paywall: true, serves: ["Strathroy-Caradoc"] },
  { name: "Chatham Daily News", wp: { api: "https://www.chathamdailynews.ca", categoryId: 7, category: "news" }, owner: "Postmedia", paywall: true, serves: ["Chatham-Kent"] },
  { name: "Belleville Intelligencer", wp: { api: "https://www.intelligencer.ca", categoryId: 8, category: "news" }, owner: "Postmedia", paywall: true, serves: ["Belleville", "Quinte West"] },
  { name: "Owen Sound Sun Times", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 9, category: "news" }, owner: "Postmedia", paywall: true, serves: ["Chatsworth", "Georgian Bluffs", "Owen Sound"] },
  { name: "Shoreline Beacon", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 6120, category: "port-elgin" }, owner: "Postmedia", paywall: true, serves: ["Arran-Elderslie", "Saugeen Shores"] },
  { name: "Kincardine News", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 6123, category: "kincardine" }, owner: "Postmedia", paywall: true, serves: ["Kincardine"] },
  { name: "Hanover Post", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 6124, category: "hanover" }, owner: "Postmedia", paywall: true, serves: ["Hanover", "Southgate", "West Grey"] },
  { name: "Lucknow Sentinel", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 6121, category: "lucknow" }, owner: "Postmedia", paywall: true, serves: ["Huron-Kinloss"] },
  { name: "Wiarton Echo", wp: { api: "https://www.owensoundsuntimes.com", categoryId: 6122, category: "wiarton" }, owner: "Postmedia", paywall: true, serves: ["South Bruce Peninsula"] },
  { name: "Cornwall Standard-Freeholder", wp: { api: "https://www.standard-freeholder.com", categoryId: 4, category: "news" }, owner: "Postmedia", paywall: true, serves: ["Cornwall"] },
  { name: "Brockville Recorder and Times", wp: { api: "https://www.recorder.ca", categoryId: 3, category: "news" }, owner: "Postmedia", paywall: true, home: "Brockville", area: "Brockville and area", serves: ["Athens", "Augusta", "Brockville", "Front of Yonge", "Prescott", "Rideau Lakes"] },
  { name: "Gananoque Reporter", wp: { api: "https://www.recorder.ca", categoryId: 4774, category: "gananoque" }, owner: "Postmedia", paywall: true, serves: ["Gananoque", "Leeds and the Thousand Islands"] },
  { name: "Pembroke Observer", wp: { api: "https://www.pembrokeobserver.com", categoryId: 9, category: "news" }, owner: "Postmedia", paywall: true, home: "Pembroke", area: "Upper Ottawa Valley", serves: ["Admaston/Bromley", "Bonnechere Valley", "Brudenell, Lyndoch and Raglan", "Deep River", "Greater Madawaska", "Head, Clara and Maria", "Horton", "Killaloe, Hagarty, Richards", "Laurentian Hills", "Laurentian Valley", "Madawaska Valley", "McNab/Braeside", "North Algona Wilberforce", "Pembroke", "Petawawa", "Renfrew"] },
  { name: "Niagara Falls Review", blox: "niagarafallsreview.ca", owner: "Torstar (NordStar Capital)", paywall: true, serves: ["Fort Erie", "Niagara Falls", "Wainfleet"] },
  { name: "St. Catharines Standard", blox: "stcatharinesstandard.ca", owner: "Torstar (NordStar Capital)", paywall: true, home: "St. Catharines", area: "Niagara Region", serves: ["Grimsby", "Lincoln", "Port Colborne", "St. Catharines", "West Lincoln"] },
  { name: "Welland Tribune", blox: "wellandtribune.ca", owner: "Torstar (NordStar Capital)", paywall: true, serves: ["Welland"] },
  { name: "Waterloo Region Record", blox: "therecord.com", owner: "Torstar (NordStar Capital)", paywall: true, home: "Kitchener", area: "Waterloo Region", serves: ["Cambridge", "Kitchener", "North Dumfries", "Waterloo", "Wellesley", "Wilmot", "Woolwich"] },
  { name: "Peterborough Examiner", blox: "thepeterboroughexaminer.com", owner: "Torstar (NordStar Capital)", paywall: true, home: "Peterborough", area: "Peterborough and the Kawarthas", serves: ["Asphodel-Norwood", "Cavan Monaghan", "Douro-Dummer", "Havelock-Belmont-Methuen", "Kawartha Lakes", "North Kawartha", "Otonabee-South Monaghan", "Peterborough", "Selwyn", "Trent Lakes"] },
  { name: "The Chronicle-Journal", blox: "chroniclejournal.com", serves: ["Thunder Bay"] },
  { name: "ParrySound.com", blox: "parrysound.com", owner: "Metroland Media (Torstar)", home: "Parry Sound", area: "Parry Sound District", serves: ["Armour", "Carling", "Joly", "Kearney", "Machar", "McDougall", "McKellar", "McMurrich/Monteith", "Parry Sound", "Perry", "Powassan", "Ryerson", "Seguin", "South River", "Strong", "Sundridge", "The Archipelago", "Whitestone"] },
  // Behind a "checking your browser" screen. If Vercel can't get through,
  // these towns simply stay without a local tab, which is where they are now.
  { name: "The Review", wp: { api: "https://thereview.ca", categoryId: 17, category: "news" }, home: "Hawkesbury", area: "Prescott and Russell", serves: ["Alfred and Plantagenet","Casselman","Champlain","Clarence-Rockland","East Hawkesbury","Hawkesbury","Russell"] },
];

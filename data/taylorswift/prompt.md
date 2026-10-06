I am building a geography-based daily quiz game called **Pin5**.

I already have other Pin5 datasets, including an Airports game. I now want you to create a new dataset:

# Pin5: Taylor Swift

This is a **public entertainment-geography quiz** about places from Taylor Swift's music career.

The player already knows they are playing a **Taylor Swift quiz**.

The objective is NOT to identify Taylor Swift.

The objective is:

**Identify a public place from Taylor Swift's music career — a venue, video set, named landmark, studio, award site, or similar — from five progressively easier clues, then place a pin on the map as close as possible to that place.**

Every map target must be a **public place** suitable for a general-audience quiz (stadiums, arenas, theatres, landmarks, streets, towns, commercial studios, festival sites, well-known public filming locations, and similar).

There is **no fixed target number of locations**.

Build the largest high-quality Taylor Swift Pin5 dataset that can reasonably be created from well-documented, meaningful geographical connections to **public** places in her music career.

Quantity must NEVER come at the expense of quality.

---

# 1. CORE GAME MECHANIC

Every location has exactly five clues.

The player starts with Clue 1 and can either guess the location on the map or reveal another clue.

Each clue should make the answer progressively easier.

The established Pin5 clue structure for this game is:

### Clue 1 — Hard Taylor Swift fact

A difficult fact aimed at knowledgeable Taylor Swift fans.

It should have a genuine connection to the target location.

It should be interesting and specific rather than generic.

A serious fan might identify the location from this clue, but most players should need more information.

### Clue 2 — Easier Taylor Swift fact / famous association

Give another Taylor-specific fact that makes the location easier to identify.

This should reveal meaningfully more information than Clue 1.

### Clue 3 — Strong narrowing clue

Give a clue that significantly narrows the answer.

This could identify or strongly indicate:

- album
- era
- tour
- song
- music video
- event
- performance
- city
- career milestone

A knowledgeable Taylor Swift fan should now have a strong chance of identifying the location.

### Clue 4 — Explicit answer

State the exact location.

For example:

"The location is Wembley Stadium."

"The location is Oheka Castle."

"The location is Cornelia Street."

Clue 4 MUST explicitly identify the answer.

### Clue 5 — Geographical locating clue

Now help the player physically find the answer on the map.

For example:

"The location is in northwest London, England."

"The location is on Long Island, New York, near Huntington."

"The location is in central Sydney, Australia."

Clue 5 should make the geography easier but MUST NOT provide coordinates.

---

# 2. IMPORTANT: THIS IS ALREADY A TAYLOR SWIFT GAME

Do NOT waste clues establishing that Taylor Swift is involved.

Bad clues include:

"This location is associated with an American singer-songwriter."

"A famous singer once performed here."

"This place has a connection to Taylor Swift."

The player already knows that.

Every clue should provide useful information about **why this particular place is connected to Taylor Swift**.

---

# 3. WHAT COUNTS AS A VALID LOCATION?

Search Taylor Swift's **public music career** for geographically meaningful **public** places.

Focus on entertainment-geography categories such as tours, performances, music-video filming sites, places named in songs, commercial studios, award venues, and other well-documented public career sites.

Potential categories include:

## Tours

Locations from all relevant tours, including:

- Fearless Tour
- Speak Now World Tour
- Red Tour
- The 1989 World Tour
- Reputation Stadium Tour
- The Eras Tour
- significant earlier performances

Potential targets include:

- stadiums
- arenas
- theatres
- clubs
- festival sites
- parks
- other significant venues

However:

**Do NOT automatically create a question for every concert venue.**

The location should have an interesting enough Taylor Swift connection to support a good Pin5 question.

---

## Significant performances

Include important performances outside normal tour dates where appropriate.

Examples might include:

- festivals
- award ceremonies
- television performances
- major benefit concerts
- career milestones
- notable guest appearances
- historically important early performances

Only include them where the geographical location is meaningful.

---

## Music videos

Research real-world filming locations used in Taylor Swift music videos.

Prefer specific public places such as:

- castles and estates used as known film sets
- streets
- hotels
- landmarks
- beaches
- neighbourhoods
- buildings open to the public or widely documented as filming sites
- towns
- parks

For example, if a video was filmed at a specific identifiable public landmark or known film-set location, target that place rather than simply targeting the nearest city.

---

## Songs and lyrics

Include genuine **public** geographical places associated with Taylor Swift songs.

Prefer places that are:

- explicitly named in lyrics
- used as song titles
- well-documented public landmarks or towns associated with a song in reputable sources

Be particularly careful here.

Distinguish between:

1. explicitly documented facts;
2. credible documented interpretations;
3. fan theories.

Do NOT present fan theories as facts.

Prefer the named public place itself when the song or title clearly refers to one. Skip unverified behind-the-scenes stories that are not about a clear public place.

---

## Public career and industry places

Include publicly documented places from Taylor Swift's music career that work as quiz map targets.

Suitable targets include:

- public venues
- cities and towns named in career milestones
- landmarks
- commercial music-industry locations
- other places already widely documented as part of her public career

Every map target must be a public place suitable for inclusion in a general-audience geography quiz.

## Recording and studios

Potentially include:

- commercial recording studios
- well-documented public or commercial places associated with important recording sessions
- album-creation sites that are publicly documented as music-industry locations

Only include these where there is a meaningful and documented Taylor Swift connection.

---

## Career locations

Include places associated with:

- record labels
- major announcements
- premieres
- award ceremonies
- significant public appearances
- important career events
- major collaborations

Again, the location needs to be interesting enough to work as a Pin5 question.

---

## Other Taylor Swift locations

Other categories are permitted if the connection is:

- significant
- interesting
- geographically meaningful
- well documented
- suitable for a Taylor Swift fan quiz

Do not add tenuous locations merely to increase the dataset size.

---

# 4. TARGET THE MOST INTERESTING GEOGRAPHICAL LEVEL

Always choose the most specific sensible map target.

For example:

Prefer:

**Wembley Stadium**

rather than:

**London**

when the clues relate specifically to Taylor's Wembley performances.

Prefer:

**Oheka Castle**

rather than:

**New York**

when the question relates to the filming location of *Blank Space*.

However, cities, towns, islands, regions, states or countries are acceptable where that genuinely represents the meaningful Taylor Swift connection.

The target must correspond to where the player should actually place their pin.

---

# 5. AVOID DUPLICATE MAP TARGETS

I want as many **distinct locations** as the evidence supports — not many pieces of Taylor Swift trivia attached to a small number of cities.

Do not repeatedly use:

- London
- New York
- Nashville
- Los Angeles
- etc.

as generic targets.

Different specific locations within the same city ARE acceptable.

For example, several London locations could be included if each has:

- a distinct physical location;
- its own coordinates;
- a meaningful Taylor Swift connection;
- substantially different clues.

Likewise, multiple New York locations are acceptable if they are genuinely separate places.

Before writing the final dataset, deduplicate all coordinates and location identities.

---

# 6. GEOGRAPHICAL ACCURACY

Every location must have accurate:

- latitude
- longitude
- city
- region
- country
- continent

Coordinates should correspond to the actual target.

For example:

If the target is Wembley Stadium, use the coordinates of Wembley Stadium.

Do NOT simply use the coordinates of central London.

If the target is a specific building, use that building.

If the target is a street, choose an appropriate representative point relevant to the Taylor Swift connection.

If the target genuinely is a city, an appropriate central coordinate may be used.

---

# 7. CAREER AND GEOGRAPHICAL DIVERSITY

Do not accidentally create:

**Pin5: Taylor Swift's Eras Tour in the USA**

I want the dataset to represent Taylor Swift's wider career.

Look for strong material associated with different periods including:

- Taylor Swift
- Fearless
- Speak Now
- Red
- 1989
- Reputation
- Lover
- folklore
- evermore
- Midnights
- The Tortured Poets Department
- The Life of a Showgirl
- Taylor's Version releases
- major tours
- early career
- other significant career periods

Only include era connections that are factually supportable.

Also seek international geographical diversity.

Strong locations may come from:

- United States
- United Kingdom
- Canada
- Europe
- Latin America
- Asia
- Australia
- New Zealand
- other countries where significant Taylor Swift connections exist

Do NOT manufacture geographical diversity by adding weak locations.

Quality always wins.

---

# 8. RESEARCH AND ACCURACY

This is extremely important.

Research the facts rather than relying solely on memory.

Useful sources may include:

- Taylor Swift's official website
- official venue websites
- official tour information
- reputable newspapers
- reputable music publications
- Billboard
- Rolling Stone
- established reference sources
- Wikipedia, particularly as a useful starting point for locations and tour histories

Every factual clue must be defensible.

Do NOT invent Taylor Swift trivia.

Do NOT present rumours as facts.

Do NOT present fan theories as facts.

Do NOT make assumptions about what songs mean unless reliable sources support the claim.

If a fact cannot be verified, don't use it.

---

# 9. CLUE QUALITY

The clues are one of the most important parts of the dataset.

Avoid boring generic clues such as:

"Taylor Swift performed here."

"This venue hosts concerts."

"This location is in America."

"Taylor visited this place."

Instead use interesting Taylor-specific facts.

Clue 1 and Clue 2 should reward Taylor Swift knowledge.

Clue 3 should significantly narrow the possibilities.

Clue 4 gives the answer.

Clue 5 helps locate that answer geographically.

The progression should feel like:

**Swiftie deep cut → recognisable Taylor fact → strong narrowing clue → answer → map help**

Each clue must add new information.

Do not simply reword the same fact five times.

---

# 10. EXAMPLE CLUE PATTERN

For a location such as Wembley Stadium, the pattern should resemble:

1. A difficult fact about Taylor's history at the venue.
2. A more recognisable Taylor event that occurred there.
3. A strong clue involving the relevant tour/era/city.
4. "The location is Wembley Stadium."
5. "The location is in northwest London, England."

Do NOT copy this blindly.

Research the actual facts and create the strongest progression possible for each individual location.

---

# 11. FINAL JSON FORMAT

The final production dataset should closely follow the structure of my existing Pin5 Airports dataset.

Use this structure:

{
  "dataset": "pin5-taylor-swift",
  "scope": "Public places connected to Taylor Swift's music career: tours, performances, music videos, songs, studios and major public events",
  "clueDesign": {
    "1": "hard Taylor Swift superfan fact",
    "2": "easier Taylor Swift fact or famous association",
    "3": "strong narrowing clue such as album, era, tour, event or city",
    "4": "explicit location name",
    "5": "geographical hint to help locate the answer"
  },
  "locationCount": 0,
  "cluesWrittenCount": 0,
  "locations": [
    {
      "id": "example-location",
      "location": "Example Location",
      "city": "Example City",
      "region": "Example Region",
      "country": "Example Country",
      "continent": "EU",
      "target": {
        "lat": 0.0000,
        "lng": 0.0000
      },
      "status": "ready",
      "clues": [
        "Hard Taylor Swift superfan fact.",
        "Easier Taylor Swift fact or famous association.",
        "Strong narrowing clue.",
        "The location is Example Location.",
        "The location is in Example City, Example Country."
      ],
      "facts": {
        "connection": "tour",
        "eras": [
          "eras-tour"
        ],
        "wikipedia": "https://..."
      }
    }
  ]
}

---

# 12. FIELD REQUIREMENTS

## id

Lowercase URL-safe identifier.

Examples:

"wembley-stadium"

"oheka-castle"

"cornelia-street"

IDs must be unique.

## location

The exact target location the player is trying to identify.

## city

The relevant city/locality.

## region

State, province, county, region or equivalent where appropriate.

## country

Full country name.

## continent

Use the same continent-code convention as the existing Pin5 datasets.

## target

Accurate latitude and longitude of the actual target.

## status

Use:

"ready"

only once the entry has passed QA.

## clues

Exactly five strings in the required difficulty order.

## facts.connection

Use a controlled category where possible:

- "tour"
- "performance"
- "music-video"
- "song"
- "career"
- "recording"
- "award-event"
- "other"

Choose the primary connection.

## facts.eras

An array containing relevant Taylor Swift eras, albums or tours.

Use consistent slugs throughout the dataset.

For example:

"fearless"

"speak-now"

"red"

"1989"

"reputation"

"lover"

"folklore"

"evermore"

"midnights"

"the-tortured-poets-department"

"the-life-of-a-showgirl"

"eras-tour"

"reputation-stadium-tour"

Use only relevant values.

## facts.wikipedia

Where an appropriate Wikipedia article exists for the physical location, include its URL.

If no appropriate Wikipedia page exists, use an empty string rather than inventing one.

Research can use other sources even though they do not need to appear in the final production JSON.

---

# 13. RESEARCH SOURCES VS PRODUCTION JSON

During research, keep track of the evidence supporting every location and clue.

However, I do NOT need every research source inserted into the final production JSON.

The final JSON should remain clean and consistent with my other Pin5 datasets.

Keep research/source notes separately during generation and QA.

---

# 14. QUALITY CONTROL

Before setting any item to:

"status": "ready"

check ALL of the following.

### Location

1. Is this genuinely a Taylor Swift-related location?
2. Is the connection meaningful enough for a specialist Taylor Swift quiz?
3. Is this a genuinely distinct map target?
4. Are its coordinates accurate?
5. Are city, region, country and continent correct?

### Facts

6. Are all Taylor Swift claims factually supported?
7. Have rumours and fan theories been excluded or clearly avoided?
8. Are song interpretations appropriately sourced?
9. Are dates, tour names, album names and events accurate?

### Clues

10. Are there exactly five clues?
11. Is Clue 1 genuinely difficult?
12. Is Clue 2 easier than Clue 1?
13. Does Clue 3 significantly narrow the answer?
14. Does Clue 4 explicitly state the location?
15. Does Clue 5 provide useful geographical help?
16. Does each clue add new information?
17. Are any clues repetitive?
18. Does an earlier clue accidentally reveal the answer?
19. Is the progression genuinely hard → easier → easy?
20. Would a Taylor Swift fan find the trivia interesting?

### Dataset

21. Is this substantially different from other entries?
22. Are too many questions concentrated around one city?
23. Are too many questions coming from one tour?
24. Are there unnecessary duplicate venues?
25. Is the dataset representative of Taylor Swift's broader career?
26. Does every entry work specifically as a MAP game?

Anything that fails should be corrected or removed.

---

# 15. DATASET SIZE

There is **no fixed target number of locations**.

I want the largest high-quality Taylor Swift Pin5 dataset that can reasonably be created from well-documented, meaningful geographical connections.

Do NOT stop when you reach 300 locations.

If research identifies:

- 250 strong locations, use 250.
- 400 strong locations, use 400.
- 600 strong locations, use 600.
- More than 600 genuinely worthwhile locations, include them.

The objective is to identify **as many distinct, high-quality locations as the available evidence supports**.

However, quantity must NEVER come at the expense of quality.

Do not include weak, repetitive or tenuous locations simply to increase the size of the dataset.

In particular, do not fill the dataset with ordinary concert venues where the only interesting fact available is that Taylor Swift performed there once.

A location should have enough Taylor Swift-specific information to support a worthwhile five-clue Pin5 question.

Set `locationCount` and `cluesWrittenCount` in the final JSON to the **actual** number of accepted locations — never hard-code a target figure.

---

# 16. RESEARCH APPROACH

Research Taylor Swift's public music career systematically rather than stopping after an arbitrary number of locations.

Search across:

- all major tours
- significant pre-headline-tour performances
- notable individual performances
- music-video filming locations
- places named in songs or used as song titles
- commercial recording studios and well-documented album-creation sites
- award ceremonies and major public events
- album and era-related public places
- significant international appearances
- other well-documented public places with meaningful Taylor Swift career connections

Continue researching until additional searches are predominantly producing:

- duplicate locations
- weak connections
- trivial concert appearances
- unverifiable claims
- locations without enough interesting material for five good clues

That point, rather than an arbitrary numerical target, determines the final dataset size.

---

# 17. CANDIDATE STAGE

Do NOT immediately write the complete production JSON.

Work in two passes:

### Pass A — names only

First build the most comprehensive **candidate list of public places** you reasonably can.

For each candidate, record only:

- location name
- city / country
- connection type (tour, music-video, song, studio, award-event, etc.)
- brief reason it is quiz-worthy
- era/tour if known

Do **not** research or output latitude/longitude in Pass A.

### Pass B — after review

Only after the candidate pool is approved, add coordinates and write the five clues in manageable batches.

Deduplicate locations and assess each candidate for suitability.

For each candidate, determine whether there is enough material to create:

1. a hard Taylor Swift superfan clue;
2. an easier Taylor Swift clue;
3. a strong narrowing clue;
4. the explicit location answer;
5. a useful geographical locating clue.

If there is insufficient material for this progression, reject the candidate.

At the end of Pass A report:

- total candidates researched
- total candidates accepted
- total candidates rejected
- accepted locations by connection type
- accepted locations by country
- accepted locations by era/tour
- reasons candidates were commonly rejected
- areas where the dataset risks becoming repetitive
- whether further research is likely to produce substantial numbers of additional worthwhile locations

Do not impose an artificial maximum on the accepted list.

I want to review this candidate pool BEFORE you spend time writing all five clues for every location.

Once the candidate list is approved, we will generate the production dataset in manageable batches and QA each batch before merging them.

---

# FINAL PRINCIPLE

The goal is NOT:

"Create 300 Taylor Swift locations."

The goal is:

**"Create the most comprehensive high-quality collection of distinct, well-documented public Taylor Swift career places that work as Pin5 map questions."**

If that produces substantially more than 300 locations, that is desirable.

If exhaustive research produces fewer than 300 locations that meet the quality threshold, do not lower the standard to reach 300.

This should feel like a game **made for Taylor Swift fans**, not a generic geography dataset with Taylor Swift's name attached to it.

The best questions should make a fan think:

**"Oh! I know this Taylor fact... where is that?"**

The Taylor Swift knowledge identifies the place.

The geography knowledge determines where they put their pin.

That combination is the core of Pin5.
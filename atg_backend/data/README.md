# Scholarship data

`scholarships.csv` holds scholarship listings in the format produced by the
[scholarship-web-scraper](https://github.com/RaveeshM/scholarship-web-scraper)
project, which scrapes collegescholarships.org:

```
Scholarship Name,Deadline,Amount,Description,Location,Years,Link
```

The committed file is the scraper's published sample export (100 scholarships).
To refresh it, run that scraper (`python scraper.py`) and drop the resulting
`scholarships.csv` in here — the full run produces 23,000+ rows.

## Importing

```bash
# preview the parsed records without touching the database
node scripts/importScholarships.js --dry-run

# import data/scholarships.csv into the Scholarship table
npm run db:import:scholarships

# import a CSV from somewhere else
node scripts/importScholarships.js /path/to/scholarships.csv
```

The importer cleans the raw scraper output: HTML entities are decoded, amounts
like `"25,000"` become numbers, year-less deadlines like `28-Feb` resolve to the
next occurrence of that date, and `Rolling`/`Varies` deadlines become `null`.
Location, study levels, and the source link are appended to the description.
Records are matched on title + provider, so re-running the import updates
existing rows rather than duplicating them.

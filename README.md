# GearGrid — Curated Tech. Honest Reviews.

A modern tech recommendation and review website focused on "Best of" lists and buying guides. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **Dark/Light Theme** — Persistent theme toggle with system preference support
- **"Best X" Article Format** — Comparison tables, product cards with pros/cons/specs, buying guides, FAQ sections
- **Star Ratings** — Half-star support for detailed product ratings
- **Tiered Picks** — Best Overall, Best Value, Premium Pick, Budget Pick badges
- **Live Search** — Real-time search across all articles with highlighted results
- **Comparison Spotlight** — Side-by-side product comparisons on the homepage
- **Responsive Design** — Mobile, tablet, and desktop layouts
- **Newsletter Signup** — Email subscription with validation
- **Affiliate-Ready** — Structured for affiliate links with proper disclosures

## Project Structure

```
geargrid/
├── index.html              # Homepage
├── css/
│   ├── reset.css           # CSS reset
│   ├── variables.css       # Design system tokens (colors, fonts, spacing)
│   ├── styles.css          # All component styles
│   └── responsive.css      # Media queries
├── js/
│   ├── main.js             # Homepage rendering from JSON data
│   ├── search.js           # Search modal functionality
│   ├── pagination.js       # Page navigation
│   ├── navigation.js       # Mobile menu, sticky header, theme toggle
│   └── newsletter.js       # Newsletter form handling
├── data/
│   └── articles.json       # All article and product data
├── pages/
│   └── article.html        # "Best X" article detail template
└── images/                 # Assets
```

## Content Model

Each article supports:
- `type: "roundup"` — Multi-product "Best X" list
- `products[]` — Array of product objects with name, price, rating, tier, pros/cons, specs, affiliate links
- `howWeTested` — Methodology section
- `faq[]` — FAQ accordion section
- `verdict` — Bottom line / final recommendation

## How to Use

1. Open `index.html` in a web browser
2. No build step or server required
3. Click any article card to view the full "Best X" format

## Design System

| Token | Value |
|-------|-------|
| Display Font | Space Grotesk |
| Body Font | Inter |
| Accent (light) | #2563eb |
| Accent (dark) | #58a6ff |
| Max Width | 1200px |
| Theme | Light/Dark toggle with localStorage persistence |

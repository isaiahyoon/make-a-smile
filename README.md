# Make a Smile ATL

A new website for Make a Smile, a Christian outreach serving neighbors experiencing homelessness in downtown Atlanta.

## Run locally

From the project directory, start a static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The site is built with HTML, CSS, and vanilla JavaScript. Gallery images are optimized WebP files in `assets/gallery/`. The video is embedded from YouTube and is loaded only when a visitor chooses to play it.

The language control switches the page between English, Spanish, and Korean. Shareable language URLs use `?lang=es` for Spanish and `?lang=ko` for Korean; English is the default.

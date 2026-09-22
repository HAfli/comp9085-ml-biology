# Assets

Deliberately close to empty.

Every graphic on this site is drawn in code rather than stored as an image file:
the site mark in `js/navigation.js`, the favicon as an inline SVG data URI in the
page shells, and every figure by D3 from live data. There are therefore no
images to go missing, no binary files in version control, and nothing that fails
to scale on a high-density display.

If you add images later, put them here and reference them with paths relative to
the page. Remember that `test_site.py` fails any `<img>` without an `alt`
attribute.

"""Generate the local Latin subset; keep the original font and its OFL license.

Requires fonttools[woff] (generated with 4.68.0). Run from repository root.
"""
from fontTools import subset

subset.main([
    "web/public/fonts/InterVariable.woff2",
    "--output-file=web/public/fonts/InterVariable-latin.woff2",
    "--flavor=woff2",
    "--unicodes=U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2212,U+FEFF,U+FFFD",
    "--layout-features=*", "--name-IDs=*", "--name-legacy", "--name-languages=*",
])

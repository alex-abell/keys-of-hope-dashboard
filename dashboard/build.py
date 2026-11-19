"""Rebuild the single-file dashboard.

Joins src/page.html, vendor/xlsx.mini.min.js, and src/app.js into
KeysOfHope_dashboard.html, the one file staff open. Run from anywhere:

    python3 dashboard/build.py
"""
from pathlib import Path

here = Path(__file__).parent
page = (here / "src" / "page.html").read_text(encoding="utf-8")
xlsx = (here / "vendor" / "xlsx.mini.min.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
app = (here / "src" / "app.js").read_text(encoding="utf-8")
out = page.replace("/*XLSX*/", xlsx).replace("/*APP*/", app)
(here / "KeysOfHope_dashboard.html").write_text(out, encoding="utf-8")
print("Wrote", here / "KeysOfHope_dashboard.html", len(out), "characters")

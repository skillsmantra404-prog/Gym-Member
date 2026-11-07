#!/usr/bin/env python3
"""Usage: python3 integrate.py index.html  ->  writes dist/index.html with the add-on inlined.
Safe to re-run: if the add-on is already inside index.html it is copied as-is (no duplicate, no failure)."""
import sys, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else "index.html"
h = open(src, encoding="utf-8").read()
if "gym_announcements_v1" in h:
    out = h
    print("Add-on already present in", src, "- copying as-is")
else:
    js = open(os.path.join(here, "gym-addon.min.js"), encoding="utf-8").read().replace("</script", "<\\/script")
    i = h.rfind("</body>")
    if i < 0: sys.exit("No </body> found.")
    out = h[:i] + "<script>" + js + "</script>" + h[i:]
out = re.sub(r">\s+<", "><", out)
d = os.path.join(os.path.dirname(os.path.abspath(src)), "dist")
os.makedirs(d, exist_ok=True)
open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(out)
print("Wrote", os.path.join(d, "index.html"), len(out), "bytes")

#!/usr/bin/env python3
"""Usage: python3 integrate.py path/to/index.html  ->  writes dist/index.html (add-on inlined)
Works on your readable OR minified index.html. Source file is never modified."""
import sys,os,re
src=sys.argv[1] if len(sys.argv)>1 else "index.html"
h=open(src,encoding="utf-8").read()
js=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"gym-addon.min.js"),encoding="utf-8").read().replace("</script","<\\/script")
if "GymAddon" in h: sys.exit("Add-on already present.")
i=h.rfind("</body>")
if i<0: sys.exit("No </body> found.")
out=h[:i]+"<script>"+js+"</script>"+h[i:]
out=re.sub(r">\s+<","><",out)  # safe: collapses whitespace between tags only
d=os.path.join(os.path.dirname(os.path.abspath(src)),"dist");os.makedirs(d,exist_ok=True)
open(os.path.join(d,"index.html"),"w",encoding="utf-8").write(out)
print("Wrote",os.path.join(d,"index.html"),len(out),"bytes")

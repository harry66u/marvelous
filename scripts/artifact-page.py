#!/usr/bin/env python3
"""Turn dist-preview/index.html into an Artifact page body (the host adds doctype/html/head/body)
and print the files map for publishing. Usage: python3 scripts/artifact-page.py <out.html>"""
import json
import re
import sys
from pathlib import Path

html = Path('dist-preview/index.html').read_text()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
head = re.sub(r'\s*<meta charset="UTF-8" />', '', head)
head = re.sub(r'\s*<meta name="viewport"[^>]*>', '', head)
title = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title, '')
page = f'{title}\n<meta name="claude:viewport-fit-sides" content="cover">\n{head.strip()}\n{body.strip()}\n'
Path(sys.argv[1]).write_text(page)
files = {str(p.relative_to('dist-preview')): str(p) for p in sorted(Path('dist-preview').rglob('*'))
         if p.is_file() and p.name != 'index.html'}
Path(sys.argv[1] + '.files.json').write_text(json.dumps(files, indent=1))
print(len(files), 'files;', title)

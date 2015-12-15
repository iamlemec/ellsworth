#!/usr/bin/env python

# latex to ellsworth converter

import re
import sys
from collections import OrderedDict

# advanced regex substitution
def sub_func(re_def,func,text):
  re_comp = re.compile(re_def)
  start = 0
  while True:
    ret = re_comp.search(text,start)
    if ret is None:
      yield text[start:]
      return
    yield text[start:ret.start()]
    if ret.groupdict():
      yield func(**ret.groupdict())
    else:
      yield func(ret.groups()[0])
    start = ret.end()

def sub_all(re_def,func,text):
  return ''.join(iter(sub_func(re_def,func,text)))

# formatter factories
def formatter(fmt):
  return lambda s: fmt.format(s)
def formatter_dict(fmt):
  return lambda **kwargs: fmt.format(**kwargs)
identity = lambda x: x

# pull in tex file
input_fname = sys.argv[1]
input_fid = open(input_fname,'r')
input_text = input_fid.read()

# extract contents
text = sub_all('\\\\documentclass(\[[^\]]*\])?{.*?}(?P<contents>(.|\n)*)\Z',formatter_dict('{contents}'),input_text) # documentclass -> html

# determine title/author info
ret_title = re.search(r'\\title\{(?P<title>.*)\}.*\n',text)
ret_author = re.search(r'\\author\{(?P<author>.*)\}.*\n',text)
ret_abstract = re.search(r'\\begin\{abstract\}\n?(?P<abstract>.*)\n?\\end\{abstract\}',text)
text = re.sub(r'\\title\{.*?\}.*\n','',text)
text = re.sub(r'\\author\{.*?\}.*\n','',text)
text = re.sub(r'\\begin\{abstract\}\n?(.*)\n?\\end\{abstract\}','',text)

# replace comments
text = re.sub(r'[^%]%(.*)',r'\n<!-- \1 -->',text)

# extract parts
(preamble,body,postamble) = sub_func('\\\\begin{document}((.|\n)*?)\\\\end{document}',identity,text) # document -> body

# generate header
title_text = '<h1 class="title">{title}</h1>'.format(**ret_title.groupdict()) if ret_title else ''
author_text = '<p class="author">{author}</p>'.format(**ret_author.groupdict()) if ret_author else ''
abstract_text = '<p class="abstract">{abstract}</p>'.format(**ret_abstract.groupdict()) if ret_abstract else ''
head_text = '<header>\n{}\n{}\n{}\n</header>'.format(title_text,author_text,abstract_text)
preamble = '<!--\n{}\n-->\n\n'.format(preamble.strip())
preamble += '<head>\n\n<script type="text/javascript" src="/local/ellsworth/js/elltwo_load.js"></script>\n<script type="text/javascript">ElltwoAutoload({});</script>\n\n</head>'

# perform substitutions
environs = OrderedDict([
  ['\\\\begin{align[*]?}(?P<eq>(.|\n)*?)\\\\end{align[*]?}','<equation>{eq}</equation>'], # align[*] -> equation
  ['\\\\begin{equation[*]?}(?P<eq>(.|\n)*?)\\\\end{equation[*]?}','<equation>{eq}</equation>'], # equation[*] -> equation
  ['\\\\begin{eqnarray[*]?}(?P<eq>(.|\n)*?)\\\\end{eqnarray[*]?}','<equation>{eq}</equation>'], # eqnarray[*] -> equation
  ['\\\\subsection[*]?{(?P<title>.*?)}(?P<contents>((?!(\\\\subsection|\\\\section))(.|\n))*)','<section>\n\n<h3 class="title">{title}</h3>\n\n{contents}</section>\n\n'], # subsection
  ['\\\\section[*]?{(?P<title>.*?)}(?P<contents>((?!\\\\section)(.|\n))*)','<section>\n\n<h2 class="title">{title}</h2>\n\n{contents}</section>\n\n'], # section
  ['\\\\includegraphics(\[[^\]]*\])?{(?P<src>.*?)}','<img src="{src}"></img>'], # includegraphics -> img
  ['\\\\begin{figure[*]?}(?P<contents>(.|\n)*?)\\\\end{figure[*]?}','<figure>{contents}</figure>'], # figure[*] -> figure
  ['\\\\begin{tabular[*]?}(?P<contents>(.|\n)*?)\\\\end{tabular[*]?}','<figure class="table">{contents}</figure>'], # tabular[*] -> table
])

body = body.replace('\\maketitle',head_text)
for (k,v) in environs.items(): body = sub_all(k,formatter_dict(v),body)

# output to file or stdout
output_text = '<!DOCTYPE html>\n<html>\n\n{}\n\n<body class="elltwo">\n\n<div class="marquee"></div>\n\n<div class="content">\n\n{}\n\n</div>\n\n</body>{}\n\n</html>'.format(preamble,body,postamble)
if len(sys.argv) > 2:
  output_fname = sys.argv[2]
  output_fid = open(output_fname,'w+')
  output_fid.write(output_text)
else:
  print output_text

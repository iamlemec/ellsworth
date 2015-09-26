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

# extract parts
text = sub_all('\\\\documentclass(\[[^\]]*\])?{.*?}(?P<contents>(.|\n)*)\Z',formatter_dict('{contents}'),input_text) # documentclass -> html
(preamble,body,postamble) = sub_func('\\\\begin{document}((.|\n)*?)\\\\end{document}',identity,text) # document -> body

# determine title/author info
ret_title = re.search('\\\\title{(?P<title>.*?)}*',preamble)
ret_auth = re.search('\\\\author{(?P<auth>.*?)}*',preamble)
title_text = '<title>{title}</title>\n'.format(**ret_title.groupdict()) if ret_title else ''
auth_text = '<author>{auth}</author>\n'.format(**ret_auth.groupdict()) if ret_auth else ''
head_text = '<header>\n{}{}</header>'.format(title_text,auth_text)
preamble = re.sub('\\\\title{.*?}\n*','',preamble)
preamble = re.sub('\\\\author{.*?}\n*','',preamble)
preamble = '<!--\n{}\n-->\n\n'.format(preamble.strip())
preamble += '<script type="text/javascript" src="/ellsworth/js/ellsworth_load.js"></script>\n<script type="text/x-mathjax-config">EllsworthConfig({});</script>'

# perform substitutions
environs = OrderedDict([
  ['\\\\begin{align[*]?}(?P<eq>(.|\n)*?)\\\\end{align[*]?}','<equation>{eq}</equation>'], # align[*] -> equation
  ['\\\\begin{equation[*]?}(?P<eq>(.|\n)*?)\\\\end{equation[*]?}','<equation>{eq}</equation>'], # equation[*] -> equation
  ['\\\\begin{eqnarray[*]?}(?P<eq>(.|\n)*?)\\\\end{eqnarray[*]?}','<equation>{eq}</equation>'], # eqnarray[*] -> equation
  ['\\\\subsection[*]?{(?P<title>.*?)}(?P<contents>((?!(\\\\subsection|\\\\section))(.|\n))*)','<subsection title="{title}">{contents}</subsection>\n\n'], # subsection
  ['\\\\section[*]?{(?P<title>.*?)}(?P<contents>((?!\\\\section)(.|\n))*)','<section title="{title}">{contents}</section>\n\n'], # section
  ['\\\\includegraphics(\[[^\]]*\])?{(?P<src>.*?)}','<media source="{src}"></media>'], # includegraphics -> media
  ['\\\\begin{figure[*]?}(?P<contents>(.|\n)*?)\\\\end{figure[*]?}','<figure>{contents}</figure>'], # figure[*] -> figure
  ['\\\\begin{tabular[*]?}(?P<contents>(.|\n)*?)\\\\end{tabular[*]?}','<table>{contents}</table>'], # tabular[*] -> table
])

body = body.replace('\\maketitle',head_text)
for (k,v) in environs.items(): body = sub_all(k,formatter_dict(v),body)

# output to file or stdout
output_text = '<html>\n\n{}<body>{}</body>{}\n</html>'.format(preamble,body,postamble)
if len(sys.argv) > 2:
  output_fname = sys.argv[2]
  output_fid = open(output_fname,'w+')
  output_fid.write(output_text)
else:
  print output_text

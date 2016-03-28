#!/usr/bin/env python3

# ellsworth to latex converter

import sys
import argparse
import re
from bs4 import BeautifulSoup, element
from html.parser import HTMLParser

preamble_inserts = ['\\linespread{1.4}',
                    '\\setlength{\parindent}{0pt}',
                    '\\setlength{\parskip}{10pt}']

document_inserts = ['\\setlength{\\abovedisplayskip}{20pt}',
                    '\\setlength{\\belowdisplayskip}{20pt}']

base_packages = ['amsmath','amsthm','amssymb','cleveref',
                 ('geometry','top=1.5in,bottom=1.5in,left=1.5in,right=1.5in'),
                 ('inputenc','utf8')]

def text_escape(text):
  text = re.sub('(?<!\\\\)\\&','\\&',text)
  text = re.sub('(?<!\\\\)%','\\%',text)
  return text

def math_escape(math):
  math = re.sub('\\\\align','&',math)
  return math

class Packages:
  def __init__(self):
    self.packages = set()

  def __iter__(self):
    return iter(sorted(self.packages,key=lambda x: x[0]))

  def add(self,name,opts=''):
    self.packages.add((name,opts))

class EllsworthParser:
  def __init__(self):
    self.clear()

  def clear(self):
    self.title = ''
    self.author = ''
    self.abstract = ''
    self.biblio = ''
    self.packages = Packages()

  def parse_soup(self,soup):
    # init
    self.clear()
    html = soup.html
    head = html.head
    body = html.body
    for pkg in base_packages:
      if type(pkg) is str:
        self.packages.add(pkg)
      else:
        self.packages.add(pkg[0],opts=pkg[1])

    # parse config
    conf = {}
    script = head.findAll('script')
    if script:
      config = str(script[-1].text)
      config = re.sub('([^\s]*):','"\\1":',config) # keys should be in quotes
      config = re.search('ElltwoAutoload\((?P<config>(.|\n)*)\)',config).groupdict()['config'] # extract dict
      conf = eval(config) # i know, i know, no time now

    # latex environments
    environs = ''
    if 'environs' in conf:
      preamble_inserts.append('\\newtheorem{theorem}{Theorem}')
      for env in conf['environs']:
        if env != 'proof':
          environs += '\\newtheorem{' + env + '}[theorem]{' + env.capitalize() + '}\n'
          environs += '\\newtheorem*{' + env + '*}{' + env.capitalize() + '}\n'
        else:
          self.packages.add('amsthm')

    # bibliography
    if 'biblio' in conf:
      self.biblio = conf['biblio'].split('.')[0]
      self.packages.add('natbib',opts='round')

    # parse body
    self.sub_level = 0
    body = self.parse_children(body)

    # make preamble info
    preamble = ''
    for (pkg,opts) in self.packages:
      preamble += '\\usepackage'
      if len(opts) > 0:
        preamble += '[' + opts + ']'
      preamble += '{' + pkg + '}\n'
    preamble += '\n\n'
    preamble += '\n'.join(preamble_inserts) + '\n\n'
    preamble += environs + '\n'

    # generate whole document
    document = ''
    document += '\\documentclass{article}\n\n' + preamble + '\n\n' + '\\begin{document}\n\n'
    document += '\n'.join(document_inserts) + '\n\n'
    if len(self.title) or len(self.author):
      title_text = '\\begin{center}\n'
      if len(self.title): title_text += '{\\LARGE \\bf %s}\n' % self.title
      if len(self.author): title_text += '\n{\\large \\bf %s}\n' % self.author
      title_text += '\\vspace{0.8cm}\n\\end{center}\n\n'
      document += title_text
    document += body + '\n\\end{document}\n'
    document = re.sub('\n[\n]+','\n\n',document)
    return document

  def parse_children(self,soup):
    return ''.join(map(self.parse_inner,soup.children))

  def parse_inner(self,soup):
    typ = type(soup)
    if typ is element.NavigableString:
      return text_escape(str(soup))
    elif typ is element.Comment:
      return '%' + str(soup.replace('\n','\n%'))
    elif typ is element.Tag:
      name = soup.name
      if name == 'script':
        return ''
      elif name == 'header':
        title = soup.select('.title')
        if len(title):
          self.title = title[0].extract().text
        author = soup.select('.author')
        if len(author):
          self.author = author[0].extract().text
        return ''
      elif name == 'div':
        return self.parse_children(soup)
      elif name == 'bibliography':
        if len(self.biblio):
          return '\n\\renewcommand\\refname{\\vskip -1cm}\n\\bibliographystyle{abbrvnat}\n\\bibliography{' + self.biblio + '}\n'
        else:
          return ''
      elif name == 'section':
        if 'id' in soup.attrs:
          label = '\\label{' + soup['id'] + '}\n'
        else:
          label = ''
        title = soup.select('.title')
        if len(title):
          title = title[0].extract().text
        else:
          title = ''
        if 'prefix' in soup.attrs:
          prefix = '\\renewcommand*{\\thesection}{' + soup['prefix'] + '}'
        else:
          prefix = ''
        sclass = soup['class'] if 'class' in soup.attrs else ''
        ast = '*' if ('nonumber' in sclass or prefix) else ''
        subcmd = self.sub_level*'sub'
        self.sub_level += 1
        subtext = self.parse_children(soup)
        self.sub_level -= 1
        return '\n\\' + subcmd + 'section' + ast + '{' + title + '}\n' + label + prefix + subtext
      elif name == 'figure':
        title = soup.select('.title')
        if len(title):
          title = title[0].extract().text
        else:
          title = ''
        figcap = soup.select('figcaption')
        if len(figcap):
          figcap = figcap[0].extract().text + '\n'
        else:
          figcap = ''
        title = '\\caption{' + title + '}\n' if title else ''
        label = '\\label{' + soup['id'] + '}\n' if ('id' in soup) else ''
        return '\\begin{figure}\n' + label + title + '\\begin{center}\n' + self.parse_children(soup).strip() + '\n\n' + figcap + '\\end{center}\n' + '\\end{figure}\n'
      elif name == 'img':
        source = soup['src']
        (path,ext) = source.rsplit('.',1)
        if ext == 'svg':
          self.packages.add('svg')
          (sdir,fname) = path.rsplit('/',1)
          img_dir = '\\includesvg[svgpath=' + img_prefix + sdir + '/,width=' + img_scale + '\\textwidth]' + '{' + fname + '}'
        else:
          self.packages.add('graphicx')
          img_dir = '\\includegraphics[scale=' + img_scale + ']' + '{' + img_prefix + source + '}'
        return img_dir
      elif name == 'table':
        label = ' \\label{' + soup['id'] + '}' if ('id' in soup) else ''
        n_cols = len(list(soup.tr.children)) # a little hacky
        thead = self.parse_inner(soup.thead.findChild('tr')) + ' \\\\ \\hline\n' if soup.thead else ''
        body = soup.tbody if soup.tbody else soup
        tbody = ' \\\\\n'.join(map(self.parse_inner,body.findAll('tr')))
        return '\\begin{center}\n\\begin{tabular}{'+('|'.join('c'*n_cols))+'}' + label +'\n' + thead + tbody + '\n\\end{tabular}\n\\end{center}'
      elif name == 'tr':
        return ' & '.join(map(self.parse_inner,soup.children))
      elif name == 'td':
        return self.parse_children(soup)
      elif name == 'p':
        return self.parse_children(soup)
      elif name == 'equation':
        if 'id' in soup.attrs:
          env = 'align'
          label = ' \\label{' + soup['id'] + '}'
        else:
          env = 'align*'
          label = ''
        return '\\begin{' + env + '}' + label + math_escape(soup.text) + '\\end{' + env + '}'
      elif name == 'footnote':
        return '\\footnote{' + soup.text + '}'
      elif name == 'ref':
        return '\\Cref{' + soup['target'] + '}'
      elif name == 'cite':
        return '\\citet{' + soup['target'] + '}'
      elif name == 'ol':
        return '\\begin{enumerate}\n' + self.parse_children(soup) + '\\end{enumerate}'
      elif name == 'ul':
        return '\\begin{itemize}\n' + self.parse_children(soup) + '\\end{itemize}'
      elif name == 'li':
        return '\\item ' + self.parse_children(soup)
      elif name == 'b':
        return '\\textbf{' + self.parse_children(soup) + '}'
      elif name == 'i':
        return '\\textit{' + self.parse_children(soup) + '}'
      elif name == 'a':
        self.packages.add('hyperref')
        return '\\href{' + soup['href'] + '}{' + self.parse_children(soup).replace('_','\\_') + '}'
      elif name == 'br':
        return '\n\n'
      elif name == 'strike':
        self.packages.add('ulem')
        return '\\sout{' + self.parse_children(soup) + '}'
      elif name == 'blockquote':
        return '\\begin{quote}' + self.parse_children(soup) + '\\end{quote}'
      #elif name == 'proposition':
      #  return self.parse_children(soup)
      elif name == 'pre':
        return self.parse_children(soup)
      elif name == 'code':
        return self.parse_children(soup)
      else:
        if 'id' in soup.attrs:
          env = name
          label = ' \\label{' + soup['id'] + '}'
        else:
          env = name
          label = ''
        return '\\begin{' + env + '}' + label + self.parse_children(soup) + '\\end{' + env + '}'
        # return '% UNRECOGNIZED: ' + str(soup)

# main

parser = argparse.ArgumentParser(description='Convert from EllTwo to LaTeX')
parser.add_argument('infile', help='Input EllTwo filename')
parser.add_argument('outfile', nargs='?', default=None, help='Output LaTeX filename')
parser.add_argument('--image-prefix', dest='image_prefix', default='', help='Image prefix (optional)')
parser.add_argument('--image-scale', dest='image_scale', default='1.0', help='Image scale (optional)')
args = parser.parse_args()

fname_in = args.infile
fname_out = args.outfile
img_prefix = args.image_prefix
img_scale = args.image_scale

fid_in = open(fname_in)
text_in = fid_in.read()

# preprocess text
#text_in = re.sub('\\&ldquo;','``',text_in)
#text_in = re.sub('\\&rdquo;','\'\'',text_in)
#text_in = re.sub('\\&','&amp;',text_in)
text_in = re.sub('&','&amp;',text_in)

# parse html
soup_in = BeautifulSoup(text_in,"html.parser")
parser = EllsworthParser()
latex_out = parser.parse_soup(soup_in)

# unescape html entities
h = HTMLParser()
latex_out = h.unescape(latex_out)

# convert \lt to <, \gt to >, and % to \%
latex_out = re.sub(r'([^\\]|^)\\lt([^a-zA-Z]|$)',r'\1<\2',latex_out)
latex_out = re.sub(r'([^\\]|^)\\gt([^a-zA-Z]|$)',r'\1>\2',latex_out)

# postprocess text

if fname_out:
  fid_out = open(fname_out,'w+')
  fid_out.write(latex_out)
  fid_out.close()
else:
  print(latex_out)

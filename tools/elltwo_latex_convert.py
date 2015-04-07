#!/usr/bin/env python

# ellsworth to latex converter

import sys
import argparse
import re
from bs4 import BeautifulSoup, element

preamble_inserts = ['\\linespread{1.4}',
                   '\\setlength{\parindent}{0pt}',
                   '\\setlength{\parskip}{10pt}',
                   '\\newtheorem{theorem}{Theorem}']

document_inserts = ['\\setlength{\\abovedisplayskip}{20pt}',
                   '\\setlength{\\belowdisplayskip}{20pt}']

base_packages = ['amsmath','amsthm','amssymb','cleveref',
                 ('geometry','top=1.5in,bottom=1.5in,left=1.5in,right=1.5in')]

class EllsworthParser:
  def __init__(self):
    self.clear()

  def clear(self):
    self.title = ''
    self.author = ''
    self.abstract = ''
    self.biblio = ''
    self.packages = set()

  def parse_soup(self,soup):
    # init
    self.clear()
    html = soup.html
    for pkg in base_packages:
      self.packages.add(pkg)

    # parse body
    self.sub_level = 0
    body = self.parse_children(html.body)

    # make preamble info
    preamble = ''
    for pkg in self.packages:
      if type(pkg) == str:
        preamble += '\\usepackage{' + pkg +'}\n'
      elif type(pkg) in [list,tuple] and len(pkg) == 2:
        preamble += '\\usepackage[' + pkg[1] + ']{' + pkg[0] + '}\n'
    preamble += '\n\n'
    preamble += '\n'.join(preamble_inserts) + '\n\n'
    if len(self.title): preamble += '\\title{' + self.title + '}\n'
    if len(self.author): preamble += '\\author{' + self.author + '}\n'
    preamble += '\\date{}\n'

    # generate whole document
    document = ''
    document += '\\documentclass{article}\n\n' + preamble + '\n\n' + '\\begin{document}\n\n'
    document += '\n'.join(document_inserts) + '\n\n'
    if len(self.title): document += '\\maketitle'
    document += body + '\n\\end{document}\n'
    document = re.sub('\n[\n]+','\n\n',document)
    return document

  def parse_children(self,soup):
    return ''.join(map(self.parse_inner,soup.children))

  def parse_inner(self,soup):
    typ = type(soup)
    if typ is element.NavigableString:
      return unicode(soup)
    elif typ is element.Comment:
      return '%' + unicode(soup.replace('\n','\n%'))
    elif typ is element.Tag:
      name = soup.name
      if name == 'script':
        return ''
      elif name == 'header':
        title = soup.select('.title')
        if len(title):
          self.title = title[0].extract().text
        return ''
      elif name == 'div':
        return self.parse_children(soup)
      elif name == 'bibliography':
        if len(self.biblio):
          return '\n\\bibliographystyle{abbrvnat}\n\\bibliography{' + self.biblio + '}\n'
        else:
          return ''
      elif name == 'section':
        if 'label' in soup:
          label = ' \\label{' + soup['label'] + '}\n'
        else:
          label = ''
        title = soup.select('.title')
        if len(title):
          title = title[0].extract().text
        else:
          title = ''
        ast = '*' if ('class' in soup and 'nonumber' in soup['class']) else ''
        subcmd = self.sub_level*'sub'
        self.sub_level += 1
        subtext = self.parse_children(soup)
        self.sub_level -= 1
        return '\n\\' + subcmd + 'section' + ast + '{' + title + '}\n' + label + subtext
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
        label = ' \\label{' + soup['label'] + '}' if ('label' in soup) else ''
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
        if 'label' in soup:
          env = 'align'
          label = ' \\label{' + soup['label'] + '}'
        else:
          env = 'align*'
          label = ''
        return '\\begin{' + env + '}' + label + soup.text + '\\end{' + env + '}'
      elif name == 'footnote':
        return '\\footnote{' + soup.text + '}'
      elif name == 'ref':
        return '\\Cref{' + soup['target'] + '}'
      elif name == 'cite':
        self.packages.add('natbib')
        return '\\citet{' + soup['target'] + '}'
      elif name == 'ol':
        return '\\begin{enumerate}\n' + self.parse_children(soup) + '\\end{enumerate}'
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
      elif name == 'proposition':
        return self.parse_children(soup)
      elif name == 'pre':
        return self.parse_children(soup)
      elif name == 'code':
        return self.parse_children(soup)
      else:
        if 'label' in soup:
          env = name
          label = ' \\label{' + soup['label'] + '}'
        else:
          env = name + '*'
          label = ''
        return '\\begin{' + env + '}' + label + '\n' + self.parse_children(soup) + '\n\\end{' + env + '}'
        # return '% UNRECOGNIZED: ' + unicode(soup)

# main

parser = argparse.ArgumentParser(description='Convert from EllTwo to LaTeX')
parser.add_argument('infile', help='Input EllTwo filename')
parser.add_argument('outfile', default=None, help='Output LaTeX filename')
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
text_in = re.subn('\\\\align','&',text_in)[0]
text_in = re.subn('\\\\plusminus','+',text_in)[0]
text_in = re.subn('\\&ldquo;','``',text_in)[0]
text_in = re.subn('\\&rdquo;','\'\'',text_in)[0]

# parse html
soup_in = BeautifulSoup(text_in)
parser = EllsworthParser()
latex_out = parser.parse_soup(soup_in)

# convert \lt to <, \gt to >, and % to \%
latex_out = re.subn('\\\\lt([^a-zA-Z0-9]|$)','< ',latex_out)[0]
latex_out = re.subn('\\\\gt([^a-zA-Z0-9]|$)','> ',latex_out)[0]

# postprocess text
latex_out = re.subn('&','\\&',latex_out)[0]

if fname_out:
  fid_out = open(fname_out,'w+')
  fid_out.write(latex_out.encode('ascii','replace'))
  fid_out.close()
else:
  print latex_out

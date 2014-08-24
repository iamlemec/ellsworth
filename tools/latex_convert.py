# ellsworth to latex converter

import sys
import re
from bs4 import BeautifulSoup, element

class EllsworthParser:
  def __init__(self):
    self.clear()

  def clear(self):
    self.title = ''
    self.author = ''
    self.abstract = ''
    self.biblio = ''

  def parse_soup(self,soup):
    # init
    self.clear()
    html = soup.html
    packages = ['amsmath','amsthm','amssymb','graphicx']

    # parse head config
    config = None
    scripts = html.head.findAll('script')
    for script in scripts:
      if script.get('type',None) == 'text/x-mathjax-config':
        config = unicode(script.text)
    config = re.sub('([^\s]*):','"\\1":',config) # keys should be in quotes
    config = re.search('EllsworthConfig\((?P<config>(.|\n)*)\)',config).groupdict()['config'] # extract dict
    conf = eval(config)

    # latex macros
    macros = ''
    for (cmd,(sub,narg)) in conf['macros'].items():
      macros += '\\newcommand{\\' + cmd + '}[' + str(narg) + ']{' + sub + '}\n'

    # latex environments
    environs = ''
    for env in conf['environs']:
      environs += '\\newtheorem{' + env + '}{' + env.capitalize() + '}\n'

    # bibliography
    if 'biblio' in conf:
      self.biblio = conf['biblio'].split('.')[0]
      packages += ['natbib']

    # parse body
    body = self.parse_children(html.body)

    # make preamble info
    preamble = ''
    preamble += '\n'.join(['\\usepackage{'+pname+'}' for pname in packages]) + '\n\n'
    preamble += macros + '\n' + environs + '\n'
    if len(self.title): preamble += '\\title{' + self.title + '}\n'
    if len(self.author): preamble += '\\author{' + self.author + '}\n'

    # generate whole document
    document = ''
    document += '\\documentclass{article}\n\n' + preamble + '\n\n' + '\\begin{document}\n\n'
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
      return '%' + unicode(soup)
    elif typ is element.Tag:
      name = soup.name
      if name == 'header':
        return self.parse_children(soup)
      elif name == 'title':
        self.title = soup.text
        return ''
      elif name == 'author':
        self.author = soup.text
        return ''
      elif name == 'bibliography':
        if len(self.biblio):
          return '\n\\bibliographystyle{abbrvnat}\n\\bibliography{' + self.biblio + '}\n'
        else:
          return ''
      elif name == 'section':
        label = ' \\label{' + soup['label'] + '}\n' if ('label' in soup.attrs) else ''
        return '\n\\section{'+soup['title']+'}\n' + label + self.parse_children(soup)
      elif name == 'subsection':
        return '\n\\subsection{'+soup['title']+'}\n' + self.parse_children(soup)
      elif name == 'figure':
        title = '\\caption{' + soup['title'] + '}\n' if ('title' in soup.attrs) else ''
        label = '\\label{' + soup['label'] + '}\n' if ('label' in soup.attrs) else ''
        caption = soup['caption'] + '\n' if ('caption' in soup.attrs) else ''
        return '\\begin{figure}\n' + label + title + '\\begin{center}' + self.parse_children(soup) + '\n' + caption + '\\end{center}\n' + '\\end{figure}'
      elif name == 'table':
        label = ' \\label{' + soup['label'] + '}' if ('label' in soup.attrs) else ''
        n_cols = len(list(soup.tr.children)) # a little hacky
        thead = self.parse_inner(soup.thead.findChild('tr')) + ' \\\\ \\hline\n' if soup.thead else ''
        body = soup.tbody if soup.tbody else soup
        tbody = ' \\\\\n'.join(map(self.parse_inner,body.findAll('tr')))
        return '\\begin{center}\n\\begin{tabular}{'+('c'*n_cols)+'}' + label +'\n' + thead + tbody + '\n\\end{tabular}\n\\end{center}'
      elif name == 'tr':
        return ' & '.join(map(self.parse_inner,soup.children))
      elif name == 'td':
        return self.parse_children(soup)
      elif name == 'text':
        return self.parse_children(soup)
      elif name == 'equation':
        if 'label' in soup.attrs:
          env = 'align'
          label = ' \\label{' + soup['label'] + '}'
        else:
          env = 'align*'
          label = ''
        return '\\begin{' + env + '}' + label + soup.text + '\\end{' + env + '}'
      elif name == 'media':
        return '\\includegraphics[scale=0.6]{' + soup['source'] + '}'
      elif name == 'footnote':
        return '\\footnote{' + soup.text + '}'
      elif name == 'ref':
        return '\\ref{' + soup['label'] + '}'
      elif name == 'cite':
        return '\\cite{' + soup['label'] + '}'
      elif name == 'enumerate':
        return '\\begin{enumerate}' + self.parse_children(soup) + '\\end{enumerate}'
      elif name == 'item':
        return '\\item ' + self.parse_children(soup)
      else:
        if 'label' in soup.attrs:
          env = name
          label = ' \\label{' + soup['label'] + '}'
        else:
          env = name + '*'
          label = ''
        return '\\begin{' + env + '}' + label + '\n' + self.parse_children(soup) + '\n\\end{' + env + '}'
        # return '% UNRECOGNIZED: ' + unicode(soup)

fname_in = sys.argv[1]
fname_out = sys.argv[2]

fid_in = open(fname_in)
soup_in = BeautifulSoup(fid_in)
parser = EllsworthParser()
latex_out = parser.parse_soup(soup_in)

fid_out = open(fname_out,'w+')
fid_out.write(latex_out)
fid_out.close()

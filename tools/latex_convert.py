# ellsworth to latex converter

import sys
import re
from bs4 import BeautifulSoup, element

preamble_inserts = ['\\linespread{1.4}',
                   '\\setlength{\parindent}{0pt}',
                   '\\setlength{\parskip}{10pt}',
                   '\\newtheorem{theorem}{Theorem}']

document_inserts = ['\\setlength{\\abovedisplayskip}{20pt}',
                   '\\setlength{\\belowdisplayskip}{20pt}']

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
    self.packages.add('amsmath')
    self.packages.add('amsthm')
    self.packages.add('amssymb')

    # parse head config
    config = None
    scripts = html.head.findAll('script')
    for script in scripts:
      if script.get('type',None) == 'text/x-mathjax-config':
        config = unicode(script.text)
    config = re.sub('([^\s]*):','"\\1":',config) # keys should be in quotes
    config = re.search('EllsworthConfig\((?P<config>(.|\n)*)\)',config).groupdict()['config'] # extract dict
    conf = eval(config) # i know, i know, no time now

    # latex macros
    macros = ''
    if 'macros' in conf:
      for (cmd,(sub,narg)) in conf['macros'].items():
        macros += '\\newcommand{\\' + cmd + '}[' + str(narg) + ']{' + sub + '}\n'

    # latex environments
    environs = ''
    if 'environs' in conf:
      for env in conf['environs']:
        if env != 'proof':
          environs += '\\newtheorem{' + env + '}[theorem]{' + env.capitalize() + '}\n'
          environs += '\\newtheorem*{' + env + '*}{' + env.capitalize() + '}\n'

    # bibliography
    if 'biblio' in conf:
      self.biblio = conf['biblio'].split('.')[0]
      self.packages.add('natbib')

    # parse body
    body = self.parse_children(html.body)

    # make preamble info
    preamble = ''
    preamble += '\n'.join(['\\usepackage{'+pname+'}' for pname in self.packages]) + '\n\n'
    preamble += '\n'.join(preamble_inserts) + '\n\n'
    preamble += macros + '\n' + environs + '\n'
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
        ast = '*' if ('class' in soup.attrs and 'nonumber' in soup['class']) else ''
        return '\n\\section' + ast + '{'+soup['title']+'}\n' + label + self.parse_children(soup)
      elif name == 'subsection':
        label = ' \\label{' + soup['label'] + '}\n' if ('label' in soup.attrs) else ''
        ast = '*' if ('class' in soup.attrs and 'nonumber' in soup['class']) else ''
        return '\n\\subsection' + ast + '{'+soup['title']+'}\n' + label + self.parse_children(soup)
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
        return '\\begin{center}\n\\begin{tabular}{'+('|'.join('c'*n_cols))+'}' + label +'\n' + thead + tbody + '\n\\end{tabular}\n\\end{center}'
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
        self.packages.add('graphicx')
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
      elif name == 'b':
        return '\\textbf{' + self.parse_children(soup) + '}'
      elif name == 'i':
        return '\\textit{' + self.parse_children(soup) + '}'
      elif name == 'a':
        self.packages.add('hyperref')
        return '\\href{' + soup['href'] + '}{' + self.parse_children(soup) + '}'
      elif name == 'br':
        return '\n\n'
      elif name == 'strike':
        self.packages.add('ulem')
        return '\\sout{' + self.parse_children(soup) + '}'
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
fname_out = sys.argv[2] if len(sys.argv) > 2 else None

fid_in = open(fname_in)
text_in = fid_in.read()

soup_in = BeautifulSoup(text_in)
parser = EllsworthParser()
latex_out = parser.parse_soup(soup_in)

# convert \lt to < and \gt to >
latex_out = re.subn('\\\\lt([^a-zA-Z0-9]|$)','< ',latex_out)[0]
latex_out = re.subn('\\\\gt([^a-zA-Z0-9]|$)','> ',latex_out)[0]

if fname_out:
  fid_out = open(fname_out,'w+')
  fid_out.write(latex_out)
  fid_out.close()
else:
  print latex_out

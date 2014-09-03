# convert JSON bibliography to BibTex format

import json

def convert_to_bib(text_in):
  json_in = json.loads(text_in)
  bib_out = ''
  for (label,info) in json_in.items():
    typ = info.pop('type')
    if typ == 'Working Paper': typ = 'technicalreport'
    bib_out += '@' + typ + '{' + label + ',\n'
    for (k,v) in info.items():
      bib_out += '  '+k+'="'+v+'",\n'
    bib_out += '}\n'
  return bib_out

def convert_to_json(bib_in):
  import re
  from collections import OrderedDict

  ret = re.match('@(.*?){(.*?),((.|\n)*)}',bib_in)
  (type,label,fields,_) = map(str.strip,ret.groups())
  fields = map(str.strip,fields.split('\n'))
  fdict = OrderedDict()
  for fstr in fields:
    ret = re.match('(.*?)={(.*?)}',fstr)
    (key,value) = ret.groups()
    fdict[key] = value
  fdict["type"] = type
  bdict = {label: fdict}
  return json.dumps(bdict,indent=2)

if __name__ == "__main__":
  import sys

  fname_in = sys.argv[1]
  fname_out = sys.argv[2] if len(sys.argv) > 2 else None
  text_in = open(fname_in,'r').read()

  (flabel_in,ext_in) = fname_in.split('.')
  if ext_in == 'bib':
    text_out = convert_to_json(text_in)
    if fname_out is None: fname_out = flabel_in + '.json'
  elif ext_in == 'json':
    text_out = convert_to_bib(text_in)
    if fname_out is None: fname_out = flabel_in + '.bib'

  fid_out = open(fname_out,'w+')
  fid_out.write(text_out)
  fid_out.close()

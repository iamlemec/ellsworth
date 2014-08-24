# convert JSON bibliography to BibTex format

import sys
import json

fname_in = sys.argv[1]
fname_out = fname_in.split('.')[0] + '.bib'

json_in = json.load(open(fname_in))

bib_out = ''
for (label,info) in json_in.items():
  bib_out += '@' + info.pop('type') + '{' + label + ',\n'
  for (k,v) in info.items():
    bib_out += '  '+k+'={{'+v+'}},\n'
  bib_out += '}\n\n'

fid_out = open(fname_out,'w+')
fid_out.write(bib_out)
fid_out.close()

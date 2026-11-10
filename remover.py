import sys,re
import os
p=os.path.join(os.path.dirname(os.path.abspath(__file__)),'app','app.js'); s=open(p).read()
for name in sys.argv[1:]:
    m=re.search(r'\n(async )?function '+re.escape(name)+r'\(', s)
    if not m: print('NAO', name); continue
    i=m.start()+1
    # one-liner?
    line_end=s.index('\n', i)
    line=s[i:line_end]
    if line.rstrip().endswith('}') and line.count('{')==line.count('}'):
        j=line_end+1
    else:
        j=s.index('\n}\n', i)+3
    blk=s[i:j]
    print(name, blk.count('\n'), 'linhas | fim:', blk.strip().splitlines()[-1][:60])
    s=s[:i]+s[j:]
open(p,'w').write(s)

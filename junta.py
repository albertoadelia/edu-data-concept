# insere app/v14.js dentro de app.js (entre os marcadores), no mesmo âmbito
import re,sys,os
B=os.path.dirname(os.path.abspath(__file__))
p=os.path.join(B,'app','app.js'); s=open(p).read()
v=open(os.path.join(B,'app','v14.js')).read()+'\n'+open(os.path.join(B,'app','v19.js')).read()+'\n'+open(os.path.join(B,'app','v20.js')).read()
i=s.index('// <<V14>>\n'); j=s.index('// <</V14>>')
s=s[:i]+'// <<V14>>\n'+v+'\n'+s[j:]
open(p,'w').write(s)
print('ok', len(v))

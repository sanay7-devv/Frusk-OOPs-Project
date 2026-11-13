import re,sys
p=sys.argv[1]
s=open(p,encoding='utf-8',newline='').read()
n=re.sub(r'<<<<<<< HEAD\r?\n(.*?)=======\r?\n(.*?)>>>>>>> [^\r\n]*\r?\n',lambda m:m.group(1)+m.group(2),s,flags=re.S)
open(p,'w',encoding='utf-8',newline='').write(n)

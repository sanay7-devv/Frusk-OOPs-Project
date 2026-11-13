import re
pat=re.compile(r'<<<<<<< HEAD\r?\n(.*?)=======\r?\n(.*?)>>>>>>> [^\r\n]*\r?\n',re.S)
def run(f,fn):
    s=open(f,encoding='utf-8',newline='').read()
    nl='\r\n' if '\r\n' in s else '\n'
    c=[0]
    def r(m):
        i=c[0]; c[0]+=1
        a=m.group(1).replace('\r','').rstrip('\n').split('\n'); b=m.group(2).replace('\r','').rstrip('\n').split('\n')
        out=fn(i,a,b)
        return nl.join(out)+nl
    s=pat.sub(r,s)
    open(f,'w',encoding='utf-8',newline='').write(s)
def road(i,a,b):
    if i==0: return ["Last updated: 2026-11-14 (M9, M10, M11 and M12 core built and smoke-tested; DEC-50 to DEC-54, DEC-60 to DEC-66, DEC-M12-1 to DEC-M12-9; D-028 to D-030)"]
    if i==1: return [a[0],b[1],'']
    if i==2: return [a[0],a[1],b[2],a[4]]
    if i==3:
        return ["| A11 | Priority what-if, escalation preview | DEC-43, DEC-51 | M10, M11 | [x] what-if 2026-11-14 (M10); escalation preview 2026-11-14 (M11) |",a[1],a[2],b[3],a[4]]
    if i==4: return [a[0],a[1],b[2]]
    if i==5: return [a[0],a[1],a[2],b[1].replace('D-028','D-030')]
    if i==6:
        res=[x for x in a if x.strip()]
        res=[x.replace("- Open after M10: the reporter withdraw action (G3, `ClosureReason.WITHDRAWN`), escalation, the auto-verify job and duplicate handling stay open because they change `Incident` and the state classes.","- Open after M10 and M11: the reporter withdraw action (G3, `ClosureReason.WITHDRAWN`) and duplicate handling (M12) stay open because they change `Incident` and the state classes.") for x in res]
        return res[:-1]+[b[0].replace('D-028','D-030')]+res[-1:]
run('ROADMAP.md',road)

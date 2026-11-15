"""Build the Postman collection from readable request definitions."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
folders = []


def folder(name):
    result={'name':name,'item':[]}; folders.append(result); return result['item']


def request(items, name, method, path, token=None, body=None, status=200, checks=''):
    headers=[{'key':'Content-Type','value':'application/json'}]
    if token: headers.append({'key':'Authorization','value':'Bearer {{'+token+'}}'})
    req={'method':method,'header':headers,'url':'{{baseUrl}}'+path}
    if body is not None:
        raw=re.sub(r'"{{([A-Za-z][A-Za-z0-9_]*)}}"', r'{{\1}}', json.dumps(body))
        req['body']={'mode':'raw','raw':raw,'options':{'raw':{'language':'json'}}}
    script=f"pm.test('HTTP {status}', () => pm.response.to.have.status({status}));\n"+checks
    items.append({'name':name,'request':req,'event':[{'listen':'test','script':{'type':'text/javascript','exec':script.splitlines()}}]})


setup=folder('Setup — real seeded accounts')
with (ROOT/'docs/content/seed_accounts.csv').open(newline='') as f:
    for account in csv.DictReader(f):
        handle=account['email'].split('@')[0]
        request(setup,'Login '+handle,'POST','/auth/login',body={
            'email':account['email'],'password':'Demo@1234'},checks=f"""
const d=pm.response.json();
pm.test('Real access and refresh tokens returned',()=>{{pm.expect(d.accessToken).to.be.a('string');pm.expect(d.refreshToken).to.be.a('string');}});
pm.collectionVariables.set('token_{handle}',d.accessToken);
pm.collectionVariables.set('id_{handle}',d.user.id);
const map=JSON.parse(pm.collectionVariables.get('tokensByUserId')||'{{}}');
map[d.user.id]=d.accessToken;pm.collectionVariables.set('tokensByUserId',JSON.stringify(map));
""")

auth=folder('Auth')
request(auth,'Current employee','GET','/auth/me','token_employee1',checks="pm.test('Employee identity',()=>pm.expect(pm.response.json().email).to.eql('employee1@iitsm.demo'));")

catalog=folder('Catalog and setup')
request(catalog,'Select Payment service','GET','/services','token_employee1',checks="""
const s=pm.response.json().find(x=>x.name==='Payment');
pm.test('Payment exists',()=>pm.expect(s).to.be.an('object'));
pm.collectionVariables.set('paymentId',s.id);
""")
request(catalog,'Select Application category','GET','/categories','token_employee1',checks="""
function flatten(rows){return rows.flatMap(x=>[x,...flatten(x.children||[])]);}
const c=flatten(pm.response.json()).find(x=>x.name==='Application');
pm.test('Application exists',()=>pm.expect(c).to.be.an('object'));
pm.collectionVariables.set('applicationCategoryId',c.id);
""")
request(catalog,'Select Database and Network services','GET','/services','token_employee1',checks="""
const rows=pm.response.json();
for(const [name,key] of [['Database','databaseId'],['Network','networkId']]){
  const service=rows.find(x=>x.name===name);
  pm.test(name+' service exists',()=>pm.expect(service).to.be.an('object'));
  pm.collectionVariables.set(key,service.id);
}
""")

incident_body={'title':'Synthetic payment checkout outage','description':'The fictional campus fee payment screen returns an error. The entire test department cannot finish checkout.',
              'serviceId':'{{paymentId}}','categoryId':'{{applicationCategoryId}}',
              'impact':5,'urgency':5,'affectedUsers':150,'confirmNotDuplicate':True}
create=folder('Workflow 1 — report and assign')
request(create,'Create Payment incident','POST','/incidents','token_employee1',incident_body,201,"""
const d=pm.response.json();
pm.test('Score 187, P1 and automatically assigned',()=>{pm.expect(d.priorityScore).to.eql(187);pm.expect(d.priority).to.eql('P1');pm.expect(d.status).to.eql('ASSIGNED');pm.expect(d.assignee).to.be.an('object');});
pm.test('Payment deadlines 3 and 20 minutes',()=>{pm.expect(Date.parse(d.responseDue)-Date.parse(d.createdAt)).to.eql(180000);pm.expect(Date.parse(d.resolutionDue)-Date.parse(d.createdAt)).to.eql(1200000);});
pm.collectionVariables.set('incidentId',d.id);
pm.collectionVariables.set('assignedToken',JSON.parse(pm.collectionVariables.get('tokensByUserId'))[d.assignee.id]);
""")

negative=folder('Negative cases')
bad=dict(incident_body,description='',impact=6,affectedUsers=0)
request(negative,'Reject invalid incident fields','POST','/incidents','token_employee1',bad,400,
        "pm.test('Validation error',()=>pm.expect(pm.response.json().code).to.eql('VALIDATION_FAILED'));")
request(negative,'Reject missing service','POST','/incidents','token_employee1',dict(incident_body,serviceId=99999),404,
        "pm.test('Missing service code',()=>pm.expect(pm.response.json().code).to.eql('SERVICE_NOT_FOUND'));")
request(negative,'Reject unrelated technician acknowledgment','POST','/incidents/{{incidentId}}/acknowledge','token_tech2',status=403,
        checks="pm.test('Authorization code',()=>pm.expect(pm.response.json().code).to.eql('UNAUTHORIZED_OPERATION'));")

lifecycle=folder('Workflow 2 — investigate and resolve')
for action,status in [('acknowledge','ACKNOWLEDGED'),('start','IN_PROGRESS')]:
    request(lifecycle,action.title(),'POST','/incidents/{{incidentId}}/'+action,'assignedToken',checks=
            f"pm.test('Expected state',()=>pm.expect(pm.response.json().status).to.eql('{status}'));")
request(lifecycle,'Reject resolution without notes','POST','/incidents/{{incidentId}}/resolve','assignedToken',
        {'rootCause':'Fictional gateway configuration drift','notes':'','timeSpentMinutes':10},400,
        "pm.test('Validation code',()=>pm.expect(pm.response.json().code).to.eql('VALIDATION_FAILED'));")
request(lifecycle,'Request reporter information','POST','/incidents/{{incidentId}}/request-info','assignedToken',
        {'message':'Please confirm which synthetic checkout transaction failed.'},checks=
        "pm.test('Paused pending reporter',()=>{const d=pm.response.json();pm.expect(d.status).to.eql('PENDING_USER_INFO');pm.expect(d.pausedAt).to.be.a('string');});")
request(lifecycle,'Reporter provides information','POST','/incidents/{{incidentId}}/provide-info','token_employee1',
        {'message':'The synthetic campus fee checkout failed during the confirmation step.'},checks=
        "pm.test('Work resumes',()=>pm.expect(pm.response.json().status).to.eql('IN_PROGRESS'));")
request(lifecycle,'Resolve with reusable notes','POST','/incidents/{{incidentId}}/resolve','assignedToken',
        {'rootCause':'Synthetic payment gateway endpoint configuration drift',
         'notes':'Restored the approved endpoint and completed synthetic checkout validation.',
         'steps':'Compared settings, restored endpoint, tested synthetic checkout.',
         'timeSpentMinutes':10,'reusableSolution':True},checks=
        "pm.test('Resolved',()=>pm.expect(pm.response.json().status).to.eql('RESOLVED'));")
request(lifecycle,'Reporter verifies','POST','/incidents/{{incidentId}}/verify','token_employee1',checks=
        "pm.test('Verified',()=>pm.expect(pm.response.json().status).to.eql('VERIFIED'));")
request(lifecycle,'Administrator closes','POST','/incidents/{{incidentId}}/close','token_asha.rao',checks=
        "pm.test('Closed with verified reason',()=>{const d=pm.response.json();pm.expect(d.status).to.eql('CLOSED');pm.expect(d.closureReason).to.eql('VERIFIED');});")
request(lifecycle,'Lifecycle audit evidence','GET','/incidents/{{incidentId}}/history','token_asha.rao',checks="""
const rows=pm.response.json();
for(const action of ['INCIDENT_CREATED','CLASSIFIED','PRIORITY_CALCULATED','ASSIGNED','ACKNOWLEDGED','WORK_STARTED','INFO_REQUESTED','INFO_PROVIDED','RESOLVED','VERIFIED','CLOSED'])
 pm.test('Audit '+action,()=>pm.expect(rows.filter(x=>x.action===action).length).to.eql(1));
""")

admin=folder('Admin and multi-role authorization')
request(admin,'Administrator user list','GET','/admin/users','token_asha.rao')
request(admin,'Employee blocked from admin','GET','/admin/users','token_employee1',status=403)
request(admin,'Karthik queue allowed','GET','/technicians/me/queue','token_karthik')
request(admin,'Karthik admin blocked','GET','/admin/users','token_karthik',status=403)

major=folder('Workflow 3 — major incident mode')
request(major,'Start outage drill','POST','/admin/demo/outage-drill','token_asha.rao',
        {'rootServiceId':'{{databaseId}}'},201,"""
const d=pm.response.json();
pm.test('Drill grouped several real incidents',()=>{
  pm.expect(d.problemId).to.be.a('number');
  pm.expect(d.incidentCodes.length).to.be.at.least(3);
  pm.expect(d.rootService.name).to.eql('Database');
});
pm.collectionVariables.set('problemId',d.problemId);
""")
request(major,'List major incidents','GET','/problems','token_asha.rao',checks="""
pm.test('New problem appears',()=>pm.expect(pm.response.json().some(x=>x.id==pm.collectionVariables.get('problemId'))).to.eql(true));
""")
request(major,'Open problem record','GET','/problems/{{problemId}}','token_asha.rao',checks="""
const d=pm.response.json();
pm.test('Problem links its incidents',()=>{pm.expect(d.status).to.eql('OPEN');pm.expect(d.incidentCount).to.be.at.least(3);pm.expect(d.incidents.length).to.eql(d.incidentCount);});
""")
request(major,'Explain root cause','GET','/problems/{{problemId}}/root-cause','token_asha.rao',checks="""
const d=pm.response.json();
pm.test('Database is the common upstream cause',()=>{pm.expect(d.probable.service.name).to.eql('Database');pm.expect(d.affectedServices.length).to.be.at.least(2);});
""")
request(major,'Show outage to affected employee','GET','/problems/known-outages?serviceId={{paymentId}}','token_employee2',checks="""
pm.test('Employee sees the known outage',()=>pm.expect(pm.response.json().some(x=>x.problemId==pm.collectionVariables.get('problemId'))).to.eql(true));
""")
request(major,'Employee joins known outage','POST','/problems/{{problemId}}/join','token_employee2',status=201,checks="""
const d=pm.response.json();
pm.test('Join creates a linked, assigned incident',()=>{pm.expect(d.status).to.eql('ASSIGNED');pm.expect(d.assignee).to.be.an('object');});
""")
request(major,'Resolve the grouped outage','POST','/problems/{{problemId}}/resolve','token_asha.rao',
        {'rootCause':'Synthetic shared Database service outage',
         'notes':'Restored the fictional database dependency and verified dependent services.',
         'steps':'Checked the dependency graph, restored service, and verified synthetic requests.',
         'timeSpentMinutes':15},checks="""
const d=pm.response.json();
pm.test('Every still-open linked incident resolves',()=>{
  pm.expect(d.status).to.eql('RESOLVED');
  pm.expect(d.incidents.every(x=>['RESOLVED','VERIFIED','CLOSED'].includes(x.status))).to.eql(true);
});
""")

intelligence=folder('Intelligence')
request(intelligence,'Suggest category from text','POST','/intelligence/suggest-category','token_employee1',
        {'title':'Synthetic VPN connection drops','description':'The fictional campus VPN disconnects every few minutes while working remotely.',
         'serviceId':'{{networkId}}'},checks="""
const d=pm.response.json();
pm.test('Keyword fallback is identified',()=>pm.expect(d.source).to.eql('KEYWORD'));
pm.test('Category is coherent when suggested',()=>{if(d.categoryId!==null)pm.expect(d.categoryName).to.be.a('string');});
""")
request(intelligence,'Suggest intake fields','POST','/intelligence/suggest-intake','token_employee1',
        {'description':'The fictional campus VPN disconnects every few minutes while working remotely.'},checks="""
const d=pm.response.json();
pm.test('Intake values are bounded',()=>{pm.expect(d.source).to.eql('KEYWORD');pm.expect(d.impact).to.be.within(1,5);pm.expect(d.urgency).to.be.within(1,5);});
""")
request(intelligence,'Find similar draft incidents','POST','/intelligence/similar','token_employee1',
        {'title':'Synthetic VPN connection drops','description':'The fictional campus VPN disconnects every few minutes while working remotely.',
         'serviceId':'{{networkId}}'},checks="""
pm.test('Similarity is a list',()=>pm.expect(pm.response.json()).to.be.an('array'));
""")
request(intelligence,'Chat about an incident','POST','/intelligence/chat','token_employee1',
        {'answer':'The fictional campus VPN disconnects every few minutes.'},checks="""
const d=pm.response.json();
pm.test('Guided chat returns a draft',()=>pm.expect(d.draft).to.be.an('object'));
""")
request(intelligence,'Find similar to saved incident','GET','/incidents/{{incidentId}}/similar','token_asha.rao',
        checks="pm.test('Saved similarity is a list',()=>pm.expect(pm.response.json()).to.be.an('array'));")
request(intelligence,'Suggest earlier resolutions','GET','/incidents/{{incidentId}}/suggested-resolutions','token_asha.rao',
        checks="pm.test('Resolutions are a list',()=>pm.expect(pm.response.json()).to.be.an('array'));")
request(intelligence,'Score SLA risk','GET','/incidents/{{incidentId}}/sla-risk','token_asha.rao',checks="""
const d=pm.response.json();
pm.test('Risk factors explain score',()=>{pm.expect(d.score).to.be.within(0,1);pm.expect(d.level).to.be.a('string');pm.expect(d.factors).to.be.an('array');pm.expect(Math.abs(d.factors.reduce((n,x)=>n+x.contribution,0)-d.score)).to.be.below(0.011);});
""")
request(intelligence,'Summarise incident thread','POST','/incidents/{{incidentId}}/summary','token_asha.rao',
        checks="pm.test('Summary identifies source',()=>{const d=pm.response.json();pm.expect(d.summary).to.be.a('string');pm.expect(d.source).to.eql('KEYWORD');});")

reports=folder('Reports')
request(reports,'Create CSV formula fixture','POST','/incidents','token_employee1',
        dict(incident_body,title='=QA_EXPORT_PROBE_20261115',serviceId='{{networkId}}'),201,
        "pm.test('Fixture was created',()=>pm.expect(pm.response.json().title).to.eql('=QA_EXPORT_PROBE_20261115'));")
request(reports,'Overview totals','GET','/reports/overview','token_asha.rao',checks="""
const d=pm.response.json();
pm.test('Open and resolved account for total',()=>pm.expect(d.open+d.resolved).to.eql(d.total));
pm.collectionVariables.set('reportTotal',d.total);
""")
request(reports,'Service distribution','GET','/reports/services','token_asha.rao',checks="""
pm.test('Service counts add to total',()=>pm.expect(pm.response.json().reduce((n,x)=>n+x.count,0)).to.eql(Number(pm.collectionVariables.get('reportTotal'))));
""")
request(reports,'Trends','GET','/reports/trends','token_asha.rao',
        checks="pm.test('Trend has dated counts',()=>pm.expect(pm.response.json().every(x=>typeof x.date==='string'&&x.created>=0&&x.resolved>=0)).to.eql(true));")
request(reports,'Priority distribution','GET','/reports/priority-distribution','token_asha.rao',checks="""
const rows=pm.response.json();
pm.test('Priority totals add up',()=>pm.expect(rows.reduce((n,x)=>n+x.count,0)).to.eql(Number(pm.collectionVariables.get('reportTotal'))));
""")
request(reports,'Category distribution','GET','/reports/category-distribution','token_asha.rao',checks="""
const rows=pm.response.json();
pm.test('Category totals add up',()=>pm.expect(rows.reduce((n,x)=>n+x.count,0)).to.eql(Number(pm.collectionVariables.get('reportTotal'))));
""")
request(reports,'SLA compliance','GET','/reports/sla-compliance','token_asha.rao',
        checks="pm.test('SLA rows are internally consistent',()=>pm.expect(pm.response.json().every(x=>x.met+x.violated<=x.total)).to.eql(true));")
request(reports,'Technician workload','GET','/reports/workload','token_asha.rao',
        checks="pm.test('Workload rows are bounded',()=>pm.expect(pm.response.json().every(x=>x.active>=0&&x.maxLoad>=0)).to.eql(true));")
request(reports,'Coverage risk','GET','/reports/coverage-risk','token_asha.rao',
        checks="pm.test('Coverage includes flagged count',()=>{const d=pm.response.json();pm.expect(d.items).to.be.an('array');pm.expect(d.flaggedCount).to.be.a('number');});")
request(reports,'CSV neutralises formula title','GET','/reports/export?type=incidents','token_asha.rao',checks="""
pm.test('Spreadsheet formula is escaped',()=>pm.expect(pm.response.text()).to.include("'=QA_EXPORT_PROBE_20261115"));
""")

notifications=folder('Notifications')
request(notifications,'Read reporter inbox','GET','/notifications','token_employee1',checks="""
const d=pm.response.json();
pm.test('Assignment created an inbox entry',()=>pm.expect(d.items.length).to.be.greaterThan(0));
pm.collectionVariables.set('notificationId',d.items[0].id);
""")
request(notifications,'Unread notification count','GET','/notifications/unread-count','token_employee1',
        checks="pm.test('Unread count is numeric',()=>pm.expect(pm.response.json().count).to.be.a('number'));")
request(notifications,'Mark notification read','POST','/notifications/{{notificationId}}/read','token_employee1',status=204)
request(notifications,'Mark all notifications read','POST','/notifications/read-all','token_employee1',status=204)
request(notifications,'List preference switches','GET','/notifications/preferences','token_employee1',
        checks="pm.test('Fifteen event types have four switches',()=>pm.expect(pm.response.json().length).to.eql(60));")
request(notifications,'Reject turning off mandatory inbox','PUT','/notifications/preferences','token_employee1',
        [{'eventType':'INCIDENT_ASSIGNED','channel':'IN_APP','enabled':False}],400,
        "pm.test('Locked switch has field error',()=>{const d=pm.response.json();pm.expect(d.code).to.eql('VALIDATION_FAILED');pm.expect(JSON.stringify(d.fieldErrors)).to.include('enabled');});")
request(notifications,'Restore default preferences','PUT','/notifications/preferences','token_employee1',[],
        checks="pm.test('All switches returned',()=>pm.expect(pm.response.json().length).to.eql(60));")

collection={'info':{'name':'I-ITSM Task 3: seeded API workflows',
                   'schema':'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
            'variable':[{'key':'baseUrl','value':'http://localhost:8080/api/v1'}], 'item':folders}
Path(__file__).with_name('iitsm.postman_collection.json').write_text(json.dumps(collection,indent=2)+'\n')
Path(__file__).with_name('local.postman_environment.json').write_text(json.dumps({
    'name':'Local disposable demo', 'values':[{'key':'baseUrl','value':'http://localhost:8080/api/v1','enabled':True}],
    '_postman_variable_scope':'environment'},indent=2)+'\n')
print('Generated API collection: three workflows, intelligence, reports, notifications and role checks.')

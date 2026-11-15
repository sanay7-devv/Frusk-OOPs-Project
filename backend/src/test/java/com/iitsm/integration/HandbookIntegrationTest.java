package com.iitsm.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import com.iitsm.application.config.ConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Real HTTP, real PostgreSQL, independent fixtures, and a clock advanced without sleeping. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties={"spring.flyway.locations=classpath:db/migration", "app.scheduling.enabled=false"})
@ActiveProfiles("test")
@Testcontainers
@Import(HandbookIntegrationTest.TimeConfig.class)
class HandbookIntegrationTest {
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @Container static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:16");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",DATABASE::getJdbcUrl);
        properties.add("spring.datasource.username",DATABASE::getUsername);
        properties.add("spring.datasource.password",DATABASE::getPassword);
    }

    static class TestClock extends Clock {
        private volatile Instant current=Instant.parse("2026-01-01T00:00:00Z");
        void set(Instant instant) {current=instant;}
        void advance(Duration duration) {current=current.plus(duration);}
        public Instant instant() {return current;}
        public ZoneId getZone() {return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zone) {return Clock.fixed(current,zone);}
    }
    @TestConfiguration(proxyBeanMethods=false) static class TimeConfig {
        @Bean @Primary TestClock testClock() {return new TestClock();}
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired TestClock clock;
    @Autowired ConfigService config;
    @Autowired com.iitsm.application.sla.SlaMonitor slaMonitor;
    @Autowired com.iitsm.application.escalation.EscalationMonitor escalationMonitor;
    @LocalServerPort int port;
    private final HttpClient client=HttpClient.newHttpClient();
    private static final AtomicInteger SERIAL=new AtomicInteger();
    private static final String PASSWORD="Demo@1234";
    private static final String HASH="$2a$10$W9XULnML.jFD3o1Sy9TkDu0iIyr7RJzqEZSguLKTICoQSOGKgJxWu";
    private String suffix;
    private long employee,otherEmployee,technician,otherTechnician,lead,admin,manager,karthik;
    private long service,payment,category,skill;
    private String employeeToken,techToken,otherTechToken,adminToken,karthikToken;
    private final Map<Long,String> emails=new HashMap<>();

    @BeforeEach void fresh_independent_fixture() throws Exception {
        int sequence=SERIAL.incrementAndGet();
        // Keep time monotonic between cases: rate-limit windows also share this clock.
        clock.set(Instant.parse("2026-01-01T00:00:00Z").plus(Duration.ofDays(sequence*10L)));
        suffix="-test"+sequence;
        // Existing rows remain for their audit FKs, but can never win this test's assignments.
        jdbc.update("update users set active=false");
        employee=user("employee",null,null); otherEmployee=user("other-employee",null,null);
        technician=user("tech",0,null); otherTechnician=user("other-tech",0,null);
        lead=user("lead",1,null); admin=user("admin",null,"SYSTEM_ADMIN");
        manager=user("manager",null,"IT_MANAGER"); karthik=user("karthik",0,null);
        skill=id("insert into skills(name) values (?) returning id","Networking"+suffix);
        category=id("insert into categories(name) values (?) returning id","Network"+suffix);
        jdbc.update("insert into category_skills(category_id,skill_id) values (?,?)",category,skill);
        for(long user:new long[]{technician,otherTechnician,lead,karthik})
            jdbc.update("insert into technician_skills(technician_id,skill_id,proficiency) values (?,?,4)",user,skill);
        service=id("insert into services(name,criticality,always_p1) values (?,4,false) returning id","Network"+suffix);
        payment=id("insert into services(name,criticality,always_p1) values (?,5,true) returning id","Payment"+suffix);
        jdbc.update("delete from sla_policies");
        int[][] policies={{5,30},{15,120},{60,480},{240,1440}};
        for(int i=0;i<4;i++) jdbc.update("insert into sla_policies(priority,response_minutes,resolution_minutes) values (?,?,?)",
                "P"+(i+1),policies[i][0],policies[i][1]);
        jdbc.update("insert into sla_policies(service_id,priority,response_minutes,resolution_minutes) values (?,'P1',3,20)",payment);
        jdbc.update("delete from escalation_policies");
        for(int level=1;level<=3;level++) for(String priority:List.of("P1","P2"))
            jdbc.update("insert into escalation_policies(priority,level,timeout_minutes) values (?,?,?)",
                    priority,level,priority.equals("P1")?10:30);
        config.update(admin,Map.of("assignment.strategy","COMPOSITE", "notification.email.retries","0"));
        employeeToken=login(employee).path("accessToken").asText();
        techToken=login(technician).path("accessToken").asText();
        otherTechToken=login(otherTechnician).path("accessToken").asText();
        adminToken=login(admin).path("accessToken").asText();
        karthikToken=login(karthik).path("accessToken").asText();
    }

    private long id(String sql,Object...args) {return jdbc.queryForObject(sql,Long.class,args);}
    private long user(String name,Integer level,String scope) {
        String email=name+suffix+"@iitsm.demo";
        long user=id("insert into users(name,email,password_hash,created_at) values (?,?,?,?) returning id",
                name,email,HASH,java.sql.Timestamp.from(clock.instant()));
        emails.put(user,email);
        jdbc.update("insert into user_roles(user_id,role_type) values (?,'EMPLOYEE')",user);
        jdbc.update("insert into employee_profiles(user_id,department,location) values (?,'Testing','Synthetic campus')",user);
        if(level!=null) {
            jdbc.update("insert into user_roles(user_id,role_type) values (?,'TECHNICIAN')",user);
            jdbc.update("insert into technician_profiles(user_id,experience_level,escalation_level,max_load) values (?,5,?,10)",user,level);
        }
        if(scope!=null) {
            jdbc.update("insert into user_roles(user_id,role_type) values (?,'ADMINISTRATOR')",user);
            jdbc.update("insert into administrator_profiles(user_id,scope) values (?,?)",user,scope);
        }
        return user;
    }
    private JsonNode call(String method,String path,String token,Object body,int expected) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path))
                .timeout(Duration.ofSeconds(15)).header("Content-Type","application/json");
        if(token!=null) builder.header("Authorization","Bearer "+token);
        builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():
                HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response=client.send(builder.build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(expected,response.statusCode(),method+" "+path+": "+response.body());
        return response.body().isBlank()?json.nullNode():json.readTree(response.body());
    }
    private JsonNode login(long user) throws Exception {
        return call("POST","/auth/login",null,Map.of("email",emails.get(user),"password",PASSWORD),200);
    }
    private void code(JsonNode response,String expected) {assertEquals(expected,response.path("code").asText());}
    private Map<String,Object> incidentBody(long serviceId,int impact,int urgency,int users) {
        return new HashMap<>(Map.of("title","Network incident "+suffix,
                "description","Fictional campus network is unavailable during the integration exercise.",
                "serviceId",serviceId,"categoryId",category,"impact",impact,"urgency",urgency,
                "affectedUsers",users,"confirmNotDuplicate",true));
    }
    private JsonNode create(String token) throws Exception {
        return call("POST","/incidents",token,incidentBody(service,2,2,1),201);
    }
    private String tokenFor(long user) throws Exception {return login(user).path("accessToken").asText();}
    private JsonNode action(long incident,String action,String token,Object body,int expected) throws Exception {
        return call("POST","/incidents/"+incident+"/"+action,token,body,expected);
    }
    private JsonNode inProgress() throws Exception {
        JsonNode incident=create(employeeToken); long id=incident.path("id").asLong();
        String token=tokenFor(incident.path("assignee").path("id").asLong());
        action(id,"acknowledge",token,null,200);
        return action(id,"start",token,null,200);
    }

    @Test @DisplayName("T19: expired token, refresh rotation, revocation and logout")
    void t19_token_lifecycle() throws Exception {
        JsonNode first=login(employee);
        clock.advance(Duration.ofMinutes(16));
        code(call("GET","/auth/me",first.path("accessToken").asText(),null,401),"TOKEN_EXPIRED");
        JsonNode second=call("POST","/auth/refresh",null,Map.of("refreshToken",first.path("refreshToken").asText()),200);
        assertNotEquals(first.path("refreshToken").asText(),second.path("refreshToken").asText());
        call("GET","/auth/me",second.path("accessToken").asText(),null,200);
        code(call("POST","/auth/refresh",null,Map.of("refreshToken",first.path("refreshToken").asText()),401),"TOKEN_INVALID");
        code(call("POST","/auth/refresh",null,Map.of("refreshToken",second.path("refreshToken").asText()),401),"TOKEN_INVALID");
        JsonNode fresh=login(employee);
        call("POST","/auth/logout",fresh.path("accessToken").asText(),Map.of("refreshToken",fresh.path("refreshToken").asText()),204);
        code(call("POST","/auth/refresh",null,Map.of("refreshToken",fresh.path("refreshToken").asText()),401),"TOKEN_INVALID");
    }

    @Test @DisplayName("T20: five-strike lockout expires after 15 minutes")
    void t20_lockout_and_unknown_email() throws Exception {
        JsonNode unknown=call("POST","/auth/login",null,Map.of("email","unknown"+suffix+"@iitsm.demo","password","wrong-password"),401);
        for(int i=0;i<5;i++) {
            JsonNode wrong=call("POST","/auth/login",null,Map.of("email",emails.get(employee),"password","wrong-password"),401);
            code(wrong,"INVALID_CREDENTIALS"); assertEquals(unknown.path("message").asText(),wrong.path("message").asText());
        }
        code(call("POST","/auth/login",null,Map.of("email",emails.get(employee),"password",PASSWORD),423),"ACCOUNT_LOCKED");
        assertTrue(jdbc.queryForObject("select locked_until=? from users where id=?",Boolean.class,
                java.sql.Timestamp.from(clock.instant().plus(Duration.ofMinutes(15))),employee));
        clock.advance(Duration.ofMinutes(15)); login(employee);
        assertEquals(0,jdbc.queryForObject("select failed_logins from users where id=?",Integer.class,employee));
        assertNull(jdbc.queryForObject("select locked_until from users where id=?",Object.class,employee));
    }

    @Test @DisplayName("T17: employee admin requests are denied and audited")
    void t17_admin_boundaries_and_audit() throws Exception {
        code(call("GET","/admin/users",employeeToken,null,403),"UNAUTHORIZED_OPERATION");
        // The implemented contract uses PUT; POST in the original handbook is outdated.
        code(call("PUT","/admin/config",employeeToken,List.of(Map.of("key","assignment.strategy","value","LOAD")),403),"UNAUTHORIZED_OPERATION");
        assertEquals(2,jdbc.queryForObject("select count(*) from audit_records where actor_id=? and action='ACCESS_DENIED'",Integer.class,employee));
        assertEquals("COMPOSITE",config.current().raw(com.iitsm.domain.config.ConfigKey.ASSIGNMENT_STRATEGY));
    }

    @Test @DisplayName("T26: multi-role user can queue/create but cannot administer")
    void t26_multi_role_permissions() throws Exception {
        call("GET","/technicians/me/queue",karthikToken,null,200);
        JsonNode incident=create(karthikToken);
        assertEquals(karthik,incident.path("reporter").path("id").asLong());
        code(call("GET","/admin/users",karthikToken,null,403),"UNAUTHORIZED_OPERATION");
    }

    @Test @DisplayName("T25: reporter is excluded from automatic and manual assignment")
    void t25_conflict_of_interest() throws Exception {
        JsonNode incident=create(karthikToken); long id=incident.path("id").asLong();
        assertNotEquals(karthik,incident.path("assignee").path("id").asLong());
        code(action(id,"reassign",adminToken,Map.of("technicianId",karthik,"reason","Test reporter conflict of interest"),403),"CONFLICT_OF_INTEREST");
        JsonNode after=call("GET","/incidents/"+id,karthikToken,null,200);
        assertEquals(incident.path("assignee"),after.path("assignee"));
    }

    @Test @DisplayName("T09: all invalid incident fields are identified")
    void t09_field_errors() throws Exception {
        var body=incidentBody(service,6,2,0); body.put("description","");
        JsonNode error=call("POST","/incidents",employeeToken,body,400); code(error,"VALIDATION_FAILED");
        String fields=error.path("fieldErrors").toString();
        for(String field:List.of("description","impact","affectedUsers")) assertTrue(fields.contains(field),fields);
        assertEquals(0,jdbc.queryForObject("select count(*) from incidents where reporter_id=?",Integer.class,employee));
    }

    @Test @DisplayName("T21: paused resolution deadline shifts exactly 20 minutes")
    void t21_pause_resume_with_clock() throws Exception {
        JsonNode incident=inProgress(); long id=incident.path("id").asLong();
        String technicianToken=tokenFor(incident.path("assignee").path("id").asLong());
        Instant due=Instant.parse(incident.path("resolutionDue").asText());
        JsonNode paused=action(id,"request-info",technicianToken,Map.of("message","Please confirm the error shown on screen."),200);
        assertEquals("PENDING_USER_INFO",paused.path("status").asText());
        clock.advance(Duration.ofMinutes(20));
        String reporterToken=tokenFor(employee);
        JsonNode resumed=action(id,"provide-info",reporterToken,Map.of("message","The synthetic network connection reports a timeout."),200);
        assertEquals("IN_PROGRESS",resumed.path("status").asText());
        assertEquals(due.plus(Duration.ofMinutes(20)),Instant.parse(resumed.path("resolutionDue").asText()));
        assertTrue(resumed.path("pausedAt").isNull());
        assertEquals(1200L,jdbc.queryForObject("select paused_seconds from incidents where id=?",Long.class,id));
    }

    @Test @DisplayName("T15: missing P4 SLA is a 422 business error")
    void t15_missing_policy() throws Exception {
        jdbc.update("delete from sla_policies where priority='P4'");
        code(call("POST","/incidents",employeeToken,incidentBody(service,1,1,1),422),"SLA_NOT_CONFIGURED");
        assertEquals(0,jdbc.queryForObject("select count(*) from incidents where reporter_id=?",Integer.class,employee));
    }

    private int count(String table,long incident,String condition) {
        return jdbc.queryForObject("select count(*) from "+table+" where incident_id=? "+condition,Integer.class,incident);
    }

    private long fixture(String state,Long assignee,String priority,Instant closedAt) {
        Instant created=closedAt==null?clock.instant():closedAt.minus(Duration.ofMinutes(10));
        int magnitude=priority==null?1:priority.equals("P1")?4:priority.equals("P3")?2:1;
        return id("""
                insert into incidents(code,title,description,reporter_id,category_id,service_id,assignee_id,
                    impact,urgency,affected_users,priority_score,priority,status,created_at,updated_at,
                    acknowledged_at,resolved_at,closed_at,closure_reason,response_due,resolution_due)
                values ('INC-2026-'||lpad(nextval('incident_code_seq')::text,5,'0'),
                    'Independent test fixture','Fictional incident prepared in the required starting state.',
                    ?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?) returning id
                """,employee,state.equals("NEW")?null:category,service,assignee,magnitude,magnitude,
                priority==null?null:magnitude*magnitude*4,priority,state,
                java.sql.Timestamp.from(created),java.sql.Timestamp.from(created),
                closedAt==null?null:java.sql.Timestamp.from(created.plusSeconds(60)),
                closedAt==null?null:java.sql.Timestamp.from(closedAt.minusSeconds(60)),
                closedAt==null?null:java.sql.Timestamp.from(closedAt),
                closedAt==null?null:"VERIFIED",java.sql.Timestamp.from(created.plusSeconds(300)),
                java.sql.Timestamp.from(created.plusSeconds(1800)));
    }

    private JsonNode closeThroughApi(JsonNode incident) throws Exception {
        long id=incident.path("id").asLong();
        String handler=tokenFor(incident.path("assignee").path("id").asLong());
        action(id,"acknowledge",handler,null,200); action(id,"start",handler,null,200);
        action(id,"resolve",handler,Map.of("rootCause","Synthetic test configuration regression",
                "notes","Restored the approved configuration and verified recovery.","timeSpentMinutes",5,
                "steps","Reproduced, corrected configuration, verified recovery.","reusableSolution",true),200);
        action(id,"verify",employeeToken,null,200);
        return action(id,"close",adminToken,null,200);
    }

    @Test @DisplayName("T01: Payment creation has priority, SLA, assignment, audit and notifications")
    void t01_payment_creation() throws Exception {
        JsonNode incident=call("POST","/incidents",employeeToken,incidentBody(payment,5,5,150),201);
        long id=incident.path("id").asLong(); long assignee=incident.path("assignee").path("id").asLong();
        assertEquals(187,incident.path("priorityScore").asInt()); assertEquals("P1",incident.path("priority").asText());
        assertEquals(category,incident.path("category").path("id").asLong());
        assertEquals("ASSIGNED",incident.path("status").asText()); assertTrue(assignee>0);
        Instant created=Instant.parse(incident.path("createdAt").asText());
        assertEquals(created.plusSeconds(180),Instant.parse(incident.path("responseDue").asText()));
        assertEquals(created.plusSeconds(1200),Instant.parse(incident.path("resolutionDue").asText()));
        for(String action:List.of("INCIDENT_CREATED","CLASSIFIED","PRIORITY_CALCULATED","ASSIGNED"))
            assertEquals(1,count("audit_records",id,"and action='"+action+"'"));
        await().atMost(Duration.ofSeconds(5)).untilAsserted(()->{
            assertTrue(jdbc.queryForObject("select count(*) from notifications where incident_id=? and user_id=? and channel='IN_APP'",Integer.class,id,employee)>0);
            assertTrue(jdbc.queryForObject("select count(*) from notifications where incident_id=? and user_id=? and channel='IN_APP' and event_type='INCIDENT_ASSIGNED'",Integer.class,id,assignee)>0);
        });
    }

    @Test @DisplayName("T02: acknowledge/start stop the response clock and audit both transitions")
    void t02_acknowledge_start() throws Exception {
        JsonNode incident=create(employeeToken); long id=incident.path("id").asLong();
        String token=tokenFor(incident.path("assignee").path("id").asLong());
        JsonNode acknowledged=action(id,"acknowledge",token,null,200);
        assertEquals("ACKNOWLEDGED",acknowledged.path("status").asText());
        assertEquals(clock.instant(),Instant.parse(acknowledged.path("acknowledgedAt").asText()));
        JsonNode started=action(id,"start",token,null,200); assertEquals("IN_PROGRESS",started.path("status").asText());
        assertEquals(acknowledged.path("acknowledgedAt"),started.path("acknowledgedAt"));
        assertEquals(1,count("audit_records",id,"and action='ACKNOWLEDGED' and previous_state='ASSIGNED' and new_state='ACKNOWLEDGED'"));
        assertEquals(1,count("audit_records",id,"and action='WORK_STARTED' and previous_state='ACKNOWLEDGED' and new_state='IN_PROGRESS'"));
        clock.advance(Duration.ofMinutes(61)); slaMonitor.runOnce();
        assertEquals(0,count("sla_violations",id,"and type='RESPONSE'"));
    }

    @Test @DisplayName("T03: full successful lifecycle closes VERIFIED with one audit per action")
    void t03_full_lifecycle() throws Exception {
        JsonNode closed=closeThroughApi(create(employeeToken)); long id=closed.path("id").asLong();
        assertEquals("CLOSED",closed.path("status").asText()); assertEquals("VERIFIED",closed.path("closureReason").asText());
        for(String action:List.of("INCIDENT_CREATED","CLASSIFIED","PRIORITY_CALCULATED","ASSIGNED",
                "ACKNOWLEDGED","WORK_STARTED","RESOLVED","VERIFIED","CLOSED"))
            assertEquals(1,count("audit_records",id,"and action='"+action+"'"));
    }

    @Test @DisplayName("T04: live LOAD strategy picks the lowest-load eligible technician twice")
    void t04_live_strategy_change() throws Exception {
        jdbc.update("update technician_profiles set availability='OFF_DUTY' where user_id in (?,?)",lead,karthik);
        fixture("ASSIGNED",technician,"P1",null);
        call("PUT","/admin/config",adminToken,List.of(Map.of("key","assignment.strategy","value","LOAD")),200);
        assertEquals(otherTechnician,create(employeeToken).path("assignee").path("id").asLong());
        assertEquals(otherTechnician,create(employeeToken).path("assignee").path("id").asLong());
    }

    @Test @DisplayName("T08: reopening works just before the seven-day limit and fails after it")
    void t08_reopen_window() throws Exception {
        long inside=fixture("CLOSED",technician,"P3",clock.instant().minus(Duration.ofDays(7)).plusSeconds(60));
        long outside=fixture("CLOSED",technician,"P3",clock.instant().minus(Duration.ofDays(7)).minusSeconds(60));
        JsonNode reopened=action(inside,"reopen",employeeToken,Map.of("reason","The synthetic issue has returned again."),200);
        assertEquals("REOPENED",reopened.path("status").asText());
        code(action(outside,"reopen",employeeToken,Map.of("reason","The synthetic issue has returned again."),409),"INVALID_STATE_TRANSITION");
        assertEquals("CLOSED",jdbc.queryForObject("select status from incidents where id=?",String.class,outside));
        assertEquals(0,count("audit_records",outside,"and action='REOPENED'"));
    }

    @Test @DisplayName("T11: closing NEW is rejected without state or audit mutation")
    void t11_illegal_close() throws Exception {
        long id=fixture("NEW",null,null,null);
        code(action(id,"close",adminToken,null,409),"INVALID_STATE_TRANSITION");
        assertEquals("NEW",jdbc.queryForObject("select status from incidents where id=?",String.class,id));
        assertEquals(0,count("audit_records",id,"and action='CLOSED'"));
    }

    @Test @DisplayName("T12: missing resolution notes leave work IN_PROGRESS")
    void t12_missing_resolution_notes() throws Exception {
        JsonNode incident=inProgress(); long id=incident.path("id").asLong();
        code(action(id,"resolve",tokenFor(incident.path("assignee").path("id").asLong()),
                Map.of("rootCause","Synthetic test configuration error","notes","","timeSpentMinutes",5),400),"VALIDATION_FAILED");
        assertEquals("IN_PROGRESS",jdbc.queryForObject("select status from incidents where id=?",String.class,id));
        assertEquals(0,count("audit_records",id,"and action='RESOLVED'"));
    }

    @Test @DisplayName("T13: no available skills leaves triage and notifies the lead")
    void t13_triage_fallback() throws Exception {
        jdbc.update("update technician_profiles set availability='OFF_DUTY'");
        JsonNode incident=create(employeeToken); long id=incident.path("id").asLong();
        assertEquals("CLASSIFIED",incident.path("status").asText()); assertTrue(incident.path("assignee").isNull());
        await().atMost(Duration.ofSeconds(5)).untilAsserted(()->assertTrue(jdbc.queryForObject(
                "select count(*) from notifications where incident_id=? and user_id=? and event_type='TRIAGE_NEEDED' and channel='IN_APP'",Integer.class,id,lead)>0));
    }

    @Test @DisplayName("T14: missing service returns SERVICE_NOT_FOUND")
    void t14_unknown_service() throws Exception {
        code(call("POST","/incidents",employeeToken,incidentBody(99999,1,1,1),404),"SERVICE_NOT_FOUND");
    }

    @Test @DisplayName("T18: another technician cannot acknowledge or mutate the assigned incident")
    void t18_wrong_technician() throws Exception {
        JsonNode incident=create(employeeToken); long id=incident.path("id").asLong();
        long assigned=incident.path("assignee").path("id").asLong();
        String wrong=assigned==technician?otherTechToken:techToken;
        code(action(id,"acknowledge",wrong,null,403),"UNAUTHORIZED_OPERATION");
        assertEquals("ASSIGNED",jdbc.queryForObject("select status from incidents where id=?",String.class,id));
        assertEquals(0,count("audit_records",id,"and action='ACKNOWLEDGED'"));
    }

    @Test @DisplayName("T22: escalation climbs 1/2/3 once and stops after acknowledgment")
    void t22_escalation_and_stop() throws Exception {
        JsonNode incident=call("POST","/incidents",employeeToken,incidentBody(payment,5,5,150),201);
        long id=incident.path("id").asLong();
        long[] recipients={lead,admin,manager};
        for(int level=1;level<=3;level++) {
            clock.advance(Duration.ofMinutes(10).plusSeconds(1));
            escalationMonitor.runOnce(); escalationMonitor.runOnce();
            assertEquals(level,jdbc.queryForObject("select escalation_level from incidents where id=?",Integer.class,id));
            assertEquals(level,count("audit_records",id,"and action='ESCALATED'"));
            long recipient=recipients[level-1];
            await().atMost(Duration.ofSeconds(5)).untilAsserted(()->assertTrue(jdbc.queryForObject(
                    "select count(*) from notifications where incident_id=? and user_id=? and event_type='INCIDENT_ESCALATED' and channel='IN_APP'",Integer.class,id,recipient)>0));
        }
        action(id,"acknowledge",tokenFor(incident.path("assignee").path("id").asLong()),null,200);
        clock.advance(Duration.ofHours(1)); escalationMonitor.runOnce();
        assertEquals(3,count("audit_records",id,"and action='ESCALATED'"));
    }

    @Test @DisplayName("T23: SLA monitor warnings and violation are durable and fire once")
    void t23_monitor_deduplication() throws Exception {
        JsonNode incident=inProgress(); long id=incident.path("id").asLong();
        Instant created=Instant.parse(incident.path("createdAt").asText());
        long seconds=Duration.between(created,Instant.parse(incident.path("resolutionDue").asText())).getSeconds();
        int[] percentages={75,90,100};
        for(int i=0;i<percentages.length;i++) {
            clock.set(created.plusSeconds(seconds*percentages[i]/100));
            slaMonitor.runOnce(); slaMonitor.runOnce();
            assertEquals(Math.min(i+1,2),count("audit_records",id,"and action='SLA_WARNING'"));
            assertEquals(i==2?1:0,count("sla_violations",id,"and type='RESOLUTION'"));
        }
        assertEquals(1,count("audit_records",id,"and action='SLA_VIOLATED'"));
    }

    @Test @DisplayName("T24: simultaneous updates allow one winner without a lost update")
    void t24_concurrent_updates() throws Exception {
        JsonNode incident=create(employeeToken); long id=incident.path("id").asLong();
        long version=incident.path("version").asLong();
        var barrier=new java.util.concurrent.CyclicBarrier(2);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var tasks=new ArrayList<java.util.concurrent.Future<HttpResponse<String>>>();
            for(int n=0;n<2;n++) {
                int index=n;
                tasks.add(pool.submit(()->{
                    var body=Map.of("description","Independent simultaneous change number "+index,
                            "version",version);
                    var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/incidents/"+id))
                            .timeout(Duration.ofSeconds(15)).header("Content-Type","application/json")
                            .header("Authorization","Bearer "+employeeToken)
                            .PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
                    barrier.await(5,java.util.concurrent.TimeUnit.SECONDS);
                    return client.send(request,HttpResponse.BodyHandlers.ofString());
                }));
            }
            var responses=new ArrayList<HttpResponse<String>>();
            for(var task:tasks) responses.add(task.get(20,java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(List.of(200,409),responses.stream().map(HttpResponse::statusCode).sorted().toList());
            var loser=responses.stream().filter(r->r.statusCode()==409).findFirst().orElseThrow();
            code(json.readTree(loser.body()),"OPTIMISTIC_LOCK_CONFLICT");
            var winner=responses.stream().filter(r->r.statusCode()==200).findFirst().orElseThrow();
            JsonNode persisted=call("GET","/incidents/"+id,employeeToken,null,200);
            assertEquals(json.readTree(winner.body()).path("description"),persisted.path("description"));
            assertEquals(version+1,persisted.path("version").asLong());
        }
    }
}

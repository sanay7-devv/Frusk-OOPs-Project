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
        clock.set(Instant.parse("2026-01-01T00:00:00Z"));
        suffix="-test"+SERIAL.incrementAndGet();
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
        config.update(admin,Map.of("assignment.strategy","COMPOSITE"));
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
        assertEquals(5,jdbc.queryForObject("select failed_logins from users where id=?",Integer.class,employee));
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
}

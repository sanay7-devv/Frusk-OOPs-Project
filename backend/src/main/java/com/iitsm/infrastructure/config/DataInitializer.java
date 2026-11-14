package com.iitsm.infrastructure.config;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.SlaPolicyRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.CalendarType;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.User;
import com.iitsm.domain.user.UserFactory;

/**
 * Automatically seeds the database on first boot with real accounts, IT services,
 * categories, and SLA policies so the application can be authenticated against
 * live database records immediately.
 */
@Component
@Profile({"dev", "schema-auto", "demo"})
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ItServiceRepository serviceRepository;
    private final CategoryRepository categoryRepository;
    private final SlaPolicyRepository slaRepository;
    private final UserFactory userFactory;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DataInitializer(UserRepository userRepository,
                           ItServiceRepository serviceRepository,
                           CategoryRepository categoryRepository,
                           SlaPolicyRepository slaRepository,
                           UserFactory userFactory,
                           PasswordEncoder passwordEncoder,
                           Clock clock) {
        this.userRepository = userRepository;
        this.serviceRepository = serviceRepository;
        this.categoryRepository = categoryRepository;
        this.slaRepository = slaRepository;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedUsers();
        seedServicesAndCategories();
        seedSlaPolicies();
    }

    private void seedUsers() {
        Instant now = clock.instant();

        // 1. Administrator (Full System Clearance)
        if (!userRepository.existsByEmail("admin@iitsm.com")) {
            User admin = userFactory.newEmployee(
                    "System Administrator",
                    "admin@iitsm.com",
                    passwordEncoder.encode("Admin@123"),
                    "IT Administration",
                    "HQ - Command Center"
            );
            admin.grantAdministratorRole(now, AdminScope.SYSTEM_ADMIN);
            admin.grantTechnicianRole(now, 5, 1, 10);
            userRepository.save(admin);
            log.info("Seeded administrator account: admin@iitsm.com / Admin@123");
        }

        if (!userRepository.existsByEmail("admin@iitsm.local")) {
            User adminLocal = userFactory.newEmployee(
                    "Administrator",
                    "admin@iitsm.local",
                    passwordEncoder.encode("Admin@123"),
                    "IT Administration",
                    "HQ - Floor 4"
            );
            adminLocal.grantAdministratorRole(now, AdminScope.SYSTEM_ADMIN);
            adminLocal.grantTechnicianRole(now, 5, 1, 10);
            userRepository.save(adminLocal);
        }

        // 2. Team Lead (Technician Escalation Level 1)
        if (!userRepository.existsByEmail("lead@iitsm.com")) {
            User lead = userFactory.newEmployee(
                    "Marcus Vance (Team Lead)",
                    "lead@iitsm.com",
                    passwordEncoder.encode("Lead@123"),
                    "Site Reliability Engineering",
                    "HQ - Room 302"
            );
            lead.grantTechnicianRole(now, 4, 1, 8);
            userRepository.save(lead);
            log.info("Seeded team lead account: lead@iitsm.com / Lead@123");
        }

        if (!userRepository.existsByEmail("lead@iitsm.local")) {
            User leadLocal = userFactory.newEmployee(
                    "Team Lead",
                    "lead@iitsm.local",
                    passwordEncoder.encode("Lead@123"),
                    "Site Reliability Engineering",
                    "HQ - Room 302"
            );
            leadLocal.grantTechnicianRole(now, 4, 1, 8);
            userRepository.save(leadLocal);
        }

        // 3. Technician (Level 0)
        if (!userRepository.existsByEmail("tech@iitsm.com")) {
            User tech = userFactory.newEmployee(
                    "Sarah Jenkins (Technician)",
                    "tech@iitsm.com",
                    passwordEncoder.encode("Tech@123"),
                    "Network Operations",
                    "Remote / Datacenter"
            );
            tech.grantTechnicianRole(now, 2, 0, 6);
            userRepository.save(tech);
            log.info("Seeded technician account: tech@iitsm.com / Tech@123");
        }

        if (!userRepository.existsByEmail("tech@iitsm.local")) {
            User techLocal = userFactory.newEmployee(
                    "Technician",
                    "tech@iitsm.local",
                    passwordEncoder.encode("Tech@123"),
                    "Network Operations",
                    "Remote / Datacenter"
            );
            techLocal.grantTechnicianRole(now, 2, 0, 6);
            userRepository.save(techLocal);
        }

        // 4. Employee (Standard Reporter)
        if (!userRepository.existsByEmail("employee@iitsm.com")) {
            User emp = userFactory.newEmployee(
                    "John Employee",
                    "employee@iitsm.com",
                    passwordEncoder.encode("User@123"),
                    "Finance & Marketing",
                    "Building B, Floor 2"
            );
            userRepository.save(emp);
            log.info("Seeded employee account: employee@iitsm.com / User@123");
        }

        if (!userRepository.existsByEmail("employee@iitsm.local")) {
            User empLocal = userFactory.newEmployee(
                    "Employee",
                    "employee@iitsm.local",
                    passwordEncoder.encode("User@123"),
                    "Finance & Marketing",
                    "Building B, Floor 2"
            );
            userRepository.save(empLocal);
        }
    }

    private void seedServicesAndCategories() {
        if (serviceRepository.findAllByOrderByNameAsc().isEmpty()) {
            serviceRepository.save(new ItService("Identity & SSO (Okta Gateway)", "Platform Team", 5, true, "Core corporate authentication broker"));
            serviceRepository.save(new ItService("Global VPN Gateway (AnyConnect Edge)", "Network Ops", 4, false, "Remote corporate encrypted gateway"));
            serviceRepository.save(new ItService("Email & Office 365 Cloud Suite", "IT Support", 3, false, "Corporate exchange, teams and mailboxes"));
            serviceRepository.save(new ItService("Core Database Cluster (Postgres Aurora)", "DBA SRE", 5, true, "Primary transactional storage engine"));
            serviceRepository.save(new ItService("Payment & Billing Engine", "FinOps", 5, true, "Payment checkout and billing services"));
            log.info("Seeded initial IT service catalog");
        }

        if (categoryRepository.findAllByOrderByNameAsc().isEmpty()) {
            categoryRepository.save(new Category("Network & Connectivity"));
            categoryRepository.save(new Category("Authentication & Access Controls"));
            categoryRepository.save(new Category("Data Integrity & Corruption"));
            categoryRepository.save(new Category("Performance & Latency Degradation"));
            categoryRepository.save(new Category("Hardware / Infrastructure Fault"));
            log.info("Seeded incident categories taxonomy");
        }
    }

    private void seedSlaPolicies() {
        if (slaRepository.findAll().isEmpty()) {
            slaRepository.save(new SlaPolicy(null, Priority.P1, 15, 240, CalendarType.ALWAYS));
            slaRepository.save(new SlaPolicy(null, Priority.P2, 30, 480, CalendarType.ALWAYS));
            slaRepository.save(new SlaPolicy(null, Priority.P3, 60, 1440, CalendarType.BUSINESS_HOURS));
            slaRepository.save(new SlaPolicy(null, Priority.P4, 120, 2880, CalendarType.BUSINESS_HOURS));
            log.info("Seeded global SLA policy matrix");
        }
    }
}

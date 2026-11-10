package com.iitsm;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IitsmBackendApplication {

    public static void main(String[] args) {
        // The Postgres driver sends the JVM time zone on connect. Some Windows zones (for example Asia/Calcutta)
        // are unknown to the postgres:16 image, so pin UTC. All timestamps are stored in UTC anyway.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(IitsmBackendApplication.class, args);
    }

}

package com.iitsm.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A technical skill (Networking, SQL, Security, ...). Admin-managed; categories require skills, technicians hold them. */
@Entity
@Table(name = "skills")
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 60)
    private String name;

    protected Skill() {
    }

    public Skill(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void rename(String newName) {
        this.name = newName;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Skill other && id != null && id.equals(other.id));
    }

    @Override
    public int hashCode() {
        return Skill.class.hashCode();
    }
}

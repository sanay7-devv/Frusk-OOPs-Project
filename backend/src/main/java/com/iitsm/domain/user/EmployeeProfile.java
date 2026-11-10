package com.iitsm.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** Employee-only data (table employee_profiles, keyed by the user id). */
@Entity
@Table(name = "employee_profiles")
public class EmployeeProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "department", length = 80)
    private String department;

    @Column(name = "location", length = 80)
    private String location;

    protected EmployeeProfile() {
    }

    EmployeeProfile(User user, String department, String location) {
        this.user = user;
        this.department = department;
        this.location = location;
    }

    public String getDepartment() {
        return department;
    }

    public String getLocation() {
        return location;
    }

    public void moveTo(String newDepartment, String newLocation) {
        this.department = newDepartment;
        this.location = newLocation;
    }
}

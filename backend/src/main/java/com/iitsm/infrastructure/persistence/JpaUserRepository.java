package com.iitsm.infrastructure.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/** Spring Data implementation of the domain {@link UserRepository}; most query methods are derived from names. */
public interface JpaUserRepository extends JpaRepository<User, Long>, UserRepository {

    /** "type(r)" selects by role subclass (the role_type discriminator). */
    @Override
    @Query("select distinct u from User u join u.roles r where type(r) = TechnicianRole order by u.name")
    List<User> findAllTechnicians();

    @Override
    @Query("select distinct u from User u join u.roles r where type(r) = AdministratorRole order by u.name")
    List<User> findAllAdministrators();
}

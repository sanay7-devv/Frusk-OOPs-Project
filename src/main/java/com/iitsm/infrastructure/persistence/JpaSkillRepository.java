package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.repository.SkillRepository;
import com.iitsm.domain.user.Skill;

/** Spring Data implementation of the domain {@link SkillRepository}. */
public interface JpaSkillRepository extends JpaRepository<Skill, Long>, SkillRepository {
}

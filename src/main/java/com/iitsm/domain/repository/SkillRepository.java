package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.user.Skill;

/** Repository pattern: storage of the skill catalog. */
public interface SkillRepository {

    Optional<Skill> findById(Long id);

    List<Skill> findAllById(Iterable<Long> ids);

    List<Skill> findAll();

    boolean existsByNameIgnoreCase(String name);

    Skill save(Skill skill);

    void delete(Skill skill);
}

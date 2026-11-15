package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.notification.PushDevice;
import com.iitsm.domain.repository.PushDeviceRepository;

/** Spring Data implementation of the domain {@link PushDeviceRepository}. */
public interface JpaPushDeviceRepository extends JpaRepository<PushDevice, Long>, PushDeviceRepository {
}

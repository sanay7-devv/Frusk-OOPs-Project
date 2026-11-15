package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.notification.PushDevice;

/** Persistence port for push devices (A4). */
public interface PushDeviceRepository {

    Optional<PushDevice> findById(Long id);

    Optional<PushDevice> findByToken(String token);

    List<PushDevice> findByUser_IdOrderByIdAsc(Long userId);

    long countByUser_Id(Long userId);

    PushDevice save(PushDevice device);

    void delete(PushDevice device);
}

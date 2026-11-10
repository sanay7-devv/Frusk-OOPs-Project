package com.iitsm.web.dto.auth;

import java.util.List;

import com.iitsm.application.auth.UserView;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.Availability;
import com.iitsm.domain.user.PermissionKey;
import com.iitsm.domain.user.RoleType;

/**
 * CurrentUser (API Data Dictionary C.3). technician and administrator are always present in the JSON, null when
 * the user does not hold that role (C.1: nullable fields are never omitted).
 */
public record CurrentUserResponse(Long id, String name, String email, List<RoleType> roles,
                                  List<PermissionKey> permissions, TechnicianInfo technician,
                                  AdministratorInfo administrator) {

    public record TechnicianInfo(int escalationLevel, Availability availability) {
    }

    public record AdministratorInfo(AdminScope scope) {
    }

    public static CurrentUserResponse from(UserView view) {
        return new CurrentUserResponse(
                view.id(),
                view.name(),
                view.email(),
                view.roles().stream().sorted().toList(),
                view.permissions().stream().sorted().toList(),
                view.technician() == null ? null
                        : new TechnicianInfo(view.technician().escalationLevel(), view.technician().availability()),
                view.administrator() == null ? null : new AdministratorInfo(view.administrator().scope()));
    }
}

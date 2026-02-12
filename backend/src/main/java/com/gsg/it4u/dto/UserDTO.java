package com.gsg.it4u.dto;

import com.gsg.it4u.entity.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private String department;
    private String jobTitle;

    public static UserDTO fromEntity(User user) {
        if (user == null)
            return null;
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .department(user.getDepartment())
                .jobTitle(user.getJobTitle())
                .build();
    }
}

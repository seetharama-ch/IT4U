package com.gsg.it4u.dto;

import lombok.Data;

@Data
public class UserCreateRequest {
    @jakarta.validation.constraints.NotBlank(message = "Username is required")
    private String username;

    @jakarta.validation.constraints.NotBlank(message = "Password is required")
    private String password;

    @jakarta.validation.constraints.NotBlank(message = "Role is required")
    private String role;

    @jakarta.validation.constraints.NotBlank(message = "Department is required")
    private String department;

    private String jobTitle;
    private String managerName;
    @jakarta.validation.constraints.NotBlank(message = "Email is required")
    @jakarta.validation.constraints.Email(message = "Invalid email format")
    private String email;

    @jakarta.validation.constraints.Pattern(regexp = "^\\+?[0-9 .\\-]{7,15}$", message = "Invalid phone number")
    private String phoneNumber;
}

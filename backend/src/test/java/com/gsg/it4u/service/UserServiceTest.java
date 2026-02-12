package com.gsg.it4u.service;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createUser_ShouldSucceed_WhenEmailIsUnique() {
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setRole(User.Role.EMPLOYEE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(user);

        User created = userService.createUser(user);

        assertNotNull(created);
        assertEquals("test@example.com", created.getEmail());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void createUser_ShouldFail_WhenEmailExists() {
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("duplicate@example.com");

        User existing = new User();
        existing.setId(1L);
        existing.setEmail("duplicate@example.com");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("duplicate@example.com")).thenReturn(Optional.of(existing));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.createUser(user);
        });

        assertTrue(exception.getMessage().contains("Email already exists"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUser_ShouldSucceed_WhenUpdatingPhoneNumber() {
        User existingUser = new User();
        existingUser.setId(1L);
        existingUser.setUsername("existing");
        existingUser.setEmail("old@example.com");

        User updateDetails = new User();
        updateDetails.setPhoneNumber("1234567890");
        updateDetails.setEmail("old@example.com"); // Same email

        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateUser(1L, updateDetails);

        assertEquals("1234567890", updated.getPhoneNumber());
        verify(userRepository, times(1)).save(existingUser);
    }

    @Test
    void updateUser_ShouldFail_WhenUpdatingToExistingEmail() {
        User existingUser = new User();
        existingUser.setId(1L);
        existingUser.setEmail("my@example.com");

        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setEmail("target@example.com");

        User updateDetails = new User();
        updateDetails.setEmail("target@example.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.findByEmail("target@example.com")).thenReturn(Optional.of(otherUser));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.updateUser(1L, updateDetails);
        });

        assertTrue(exception.getMessage().contains("Email already exists"));
    }
}

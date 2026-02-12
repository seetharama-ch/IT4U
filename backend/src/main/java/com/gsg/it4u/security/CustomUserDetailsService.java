package com.gsg.it4u.security;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalized = username == null ? "" : username.trim();
        User user = userRepository.findByUsername(normalized)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + normalized));

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(user.getUsername())
                .password(user.getPassword()) // NoOpPasswordEncoder will handle plain text
                .roles(user.getRole().name())
                .build();
    }
}

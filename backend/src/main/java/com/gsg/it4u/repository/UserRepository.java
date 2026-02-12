package com.gsg.it4u.repository;

import com.gsg.it4u.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    java.util.List<User> findByManagerId(Long managerId);

    java.util.List<User> findByRole(User.Role role);

    java.util.List<User> findByRoleAndActiveTrue(User.Role role);

    org.springframework.data.domain.Page<User> findByActiveTrue(org.springframework.data.domain.Pageable pageable);
}

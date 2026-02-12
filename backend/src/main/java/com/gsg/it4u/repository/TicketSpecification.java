package com.gsg.it4u.repository;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

public class TicketSpecification {

    public static Specification<Ticket> filterTickets(
            String ticketNumber,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            String raisedBy,
            String managerAssigned) {

        return (root, query, cb) -> {
            Specification<Ticket> spec = Specification.where(null);

            if (StringUtils.hasText(ticketNumber)) {
                spec = spec.and(
                        (r, q, b) -> b.like(b.lower(r.get("ticketNumber")), "%" + ticketNumber.toLowerCase() + "%"));
            }

            if (createdFrom != null) {
                spec = spec.and((r, q, b) -> b.greaterThanOrEqualTo(r.get("createdAt"), createdFrom));
            }

            if (createdTo != null) {
                spec = spec.and((r, q, b) -> b.lessThanOrEqualTo(r.get("createdAt"), createdTo));
            }

            if (StringUtils.hasText(raisedBy)) {
                spec = spec.and((r, q, b) -> {
                    Join<Ticket, User> requester = r.join("requester", JoinType.LEFT);
                    String pattern = "%" + raisedBy.toLowerCase() + "%";
                    return b.or(
                            b.like(b.lower(requester.get("fullName")), pattern),
                            b.like(b.lower(requester.get("email")), pattern));
                });
            }

            if (StringUtils.hasText(managerAssigned)) {
                spec = spec.and((r, q, b) -> {
                    Join<Ticket, User> manager = r.join("manager", JoinType.LEFT);
                    String pattern = "%" + managerAssigned.toLowerCase() + "%";
                    return b.or(
                            b.like(b.lower(manager.get("fullName")), pattern),
                            b.like(b.lower(manager.get("email")), pattern));
                });
            }

            // Exclude soft-deleted tickets
            spec = spec.and((r, q, b) -> b.or(b.isFalse(r.get("deleted")), b.isNull(r.get("deleted"))));

            return spec.toPredicate(root, query, cb);
        };
    }
}

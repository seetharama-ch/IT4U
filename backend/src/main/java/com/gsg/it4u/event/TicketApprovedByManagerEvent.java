package com.gsg.it4u.event;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketApprovedByManagerEvent extends ApplicationEvent {
    private final Ticket ticket;
    private final User manager;

    public TicketApprovedByManagerEvent(Object source, Ticket ticket, User manager) {
        super(source);
        this.ticket = ticket;
        this.manager = manager;
    }
}

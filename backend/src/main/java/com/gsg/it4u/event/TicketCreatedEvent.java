package com.gsg.it4u.event;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketCreatedEvent extends ApplicationEvent {
    private final Ticket ticket;
    private final User creator;
    private final User manager;

    public TicketCreatedEvent(Object source, Ticket ticket, User creator, User manager) {
        super(source);
        this.ticket = ticket;
        this.creator = creator;
        this.manager = manager;
    }
}

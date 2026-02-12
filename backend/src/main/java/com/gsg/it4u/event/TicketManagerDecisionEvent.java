package com.gsg.it4u.event;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketManagerDecisionEvent extends ApplicationEvent {
    private final Ticket ticket;
    private final boolean approved;
    private final User manager;
    private final String comment;

    public TicketManagerDecisionEvent(Object source, Ticket ticket, boolean approved, User manager, String comment) {
        super(source);
        this.ticket = ticket;
        this.approved = approved;
        this.manager = manager;
        this.comment = comment;
    }
}

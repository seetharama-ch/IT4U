package com.gsg.it4u.event;

import com.gsg.it4u.dto.TicketDTO;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketStatusChangedEvent extends ApplicationEvent {
    private final TicketDTO ticketDTO;
    private final Ticket.Status oldStatus;
    private final Ticket.Status newStatus;
    private final User actor;
    private final String comment;

    public TicketStatusChangedEvent(Object source, TicketDTO ticketDTO, Ticket.Status oldStatus,
            Ticket.Status newStatus,
            User actor, String comment) {
        super(source);
        this.ticketDTO = ticketDTO;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.actor = actor;
        this.comment = comment;
    }
}

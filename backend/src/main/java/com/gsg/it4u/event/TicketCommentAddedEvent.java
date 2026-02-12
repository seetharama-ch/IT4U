package com.gsg.it4u.event;

import com.gsg.it4u.dto.TicketDTO;
import com.gsg.it4u.entity.Comment;
import com.gsg.it4u.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketCommentAddedEvent extends ApplicationEvent {
    private final TicketDTO ticketDTO;
    private final Comment commentEntity;
    private final User actor;

    public TicketCommentAddedEvent(Object source, TicketDTO ticketDTO, Comment commentEntity, User actor) {
        super(source);
        this.ticketDTO = ticketDTO;
        this.commentEntity = commentEntity;
        this.actor = actor;
    }
}

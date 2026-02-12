package com.gsg.it4u.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ForwardHeaderStartupLog {
    private static final Logger log = LoggerFactory.getLogger(ForwardHeaderStartupLog.class);

    @Value("${server.forward-headers-strategy:NOT_SET}")
    private String strategy;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("FORWARDED HEADERS: server.forward-headers-strategy={}", strategy);
    }
}

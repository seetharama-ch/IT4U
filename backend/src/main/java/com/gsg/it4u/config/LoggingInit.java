package com.gsg.it4u.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class LoggingInit {

    @PostConstruct
    public void init() {
        LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();
        Logger rootLogger = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME);

        CircularLogAppender appender = new CircularLogAppender();
        appender.setContext(loggerContext);
        appender.setName("CIRCULAR");
        appender.start();

        rootLogger.addAppender(appender);
    }
}

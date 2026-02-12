package com.gsg.it4u.config;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.core.AppenderBase;
import com.gsg.it4u.dto.LogEntry;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

/**
 * In-memory circular buffer for recent logs.
 */
public class CircularLogAppender extends AppenderBase<ILoggingEvent> {

    private static final int MAX_LOGS = 500;
    private static final ConcurrentLinkedDeque<LogEntry> LOG_BUFFER = new ConcurrentLinkedDeque<>();

    @Override
    protected void append(ILoggingEvent event) {
        if (event == null)
            return;

        String trace = "";
        IThrowableProxy throwableProxy = event.getThrowableProxy();
        if (throwableProxy != null) {
            trace = getStackTrace(throwableProxy);
        }

        LogEntry entry = new LogEntry(
                event.getTimeStamp(),
                event.getLevel().toString(),
                event.getFormattedMessage(),
                event.getLoggerName(),
                trace);

        LOG_BUFFER.add(entry);
        while (LOG_BUFFER.size() > MAX_LOGS) {
            LOG_BUFFER.poll();
        }
    }

    public static List<LogEntry> getLogs() {
        // Return a copy to avoid concurrency issues during iteration
        return new ArrayList<>(LOG_BUFFER).stream()
                .sorted((a, b) -> Long.compare(b.getTimestamp(), a.getTimestamp())) // Newest first
                .collect(Collectors.toList());
    }

    private String getStackTrace(IThrowableProxy throwableProxy) {
        StringBuilder sb = new StringBuilder();
        sb.append(throwableProxy.getClassName()).append(": ").append(throwableProxy.getMessage()).append("\n");
        for (StackTraceElementProxy element : throwableProxy.getStackTraceElementProxyArray()) {
            sb.append("\t").append(element.toString()).append("\n");
        }
        return sb.toString();
    }
}

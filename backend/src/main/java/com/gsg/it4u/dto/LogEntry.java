package com.gsg.it4u.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogEntry {
    private long timestamp;
    private String level;
    private String message;
    private String loggerName;
    private String trace;
}

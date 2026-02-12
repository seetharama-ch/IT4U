package com.gsg.it4u.controller;

import com.gsg.it4u.dto.ReportFilter;
import com.gsg.it4u.dto.TicketReportDTO;
import com.gsg.it4u.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class ReportController {

        private final ReportService reportService;

        @GetMapping("/tickets")
        // Relying on global security like TicketController
        public ResponseEntity<Page<TicketReportDTO>> getTicketReport(
                        @ModelAttribute ReportFilter filter,
                        @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
                return ResponseEntity.ok(reportService.getTickets(filter, pageable));
        }

        @GetMapping("/tickets/export")
        // Relying on global security like TicketController
        public ResponseEntity<InputStreamResource> exportTicketReport(@ModelAttribute ReportFilter filter) {
                String filename = "tickets_report_"
                                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                                + ".xlsx";
                InputStreamResource file = new InputStreamResource(reportService.exportTicketsToExcel(filter));

                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                                .contentType(
                                                MediaType.parseMediaType(
                                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(file);
        }

        @GetMapping("/tickets/export/csv")
        // Relying on global security like TicketController
        public ResponseEntity<InputStreamResource> exportTicketReportCsv(@ModelAttribute ReportFilter filter) {
                String filename = "tickets_report_"
                                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                                + ".csv";
                InputStreamResource file = new InputStreamResource(reportService.exportTicketsToCsv(filter));

                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                                .contentType(MediaType.parseMediaType("text/csv"))
                                .body(file);
        }
}

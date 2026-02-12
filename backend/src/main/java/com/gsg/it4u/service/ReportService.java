package com.gsg.it4u.service;

import com.gsg.it4u.dto.ReportFilter;
import com.gsg.it4u.dto.TicketReportDTO;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.repository.TicketRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final TicketRepository ticketRepository;

    public Page<TicketReportDTO> getTickets(ReportFilter filter, Pageable pageable) {
        Specification<Ticket> spec = createSpecification(filter);
        return ticketRepository.findAll(spec, pageable).map(TicketReportDTO::fromEntity);
    }

    public ByteArrayInputStream exportTicketsToExcel(ReportFilter filter) {
        Specification<Ticket> spec = createSpecification(filter);
        // Limit export to 10,000 to avoid memory issues as requested
        // using pagination for fetching all might be better if dataset is huge, but for
        // 10k literal limit:
        List<Ticket> tickets = ticketRepository.findAll(spec);

        if (tickets.size() > 10000) {
            tickets = tickets.subList(0, 10000);
            log.warn("Export limit reached. Truncating to 10000 rows.");
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ticket Report");

            // Header
            String[] commonHeaders = {
                    "Ticket No", "Title", "Category", "Sub-Category", "Status", "Manager Approval",
                    "Priority", "Employee Name", "Employee ID", "Employee Email", "Manager Name",
                    "Assigned To", "Device Details", "Created At", "Updated At", "SLA Status",
                    "Department", "Location"
            };

            Row headerRow = sheet.createRow(0);
            CellStyle headerCellStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerCellStyle.setFont(headerFont);

            for (int col = 0; col < commonHeaders.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(commonHeaders[col]);
                cell.setCellStyle(headerCellStyle);
            }

            // Data
            int rowIdx = 1;
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (Ticket ticket : tickets) {
                TicketReportDTO dto = TicketReportDTO.fromEntity(ticket);
                Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(dto.getTicketNumber());
                row.createCell(1).setCellValue(dto.getTitle());
                row.createCell(2).setCellValue(dto.getCategory());
                row.createCell(3).setCellValue(dto.getSubCategory());
                row.createCell(4).setCellValue(dto.getStatus());
                row.createCell(5).setCellValue(dto.getManagerApprovalStatus());
                row.createCell(6).setCellValue(dto.getPriority());
                row.createCell(7).setCellValue(dto.getEmployeeName());
                row.createCell(8).setCellValue(dto.getEmployeeId());
                row.createCell(9).setCellValue(dto.getEmployeeEmail());
                row.createCell(10).setCellValue(dto.getManagerName());
                row.createCell(11).setCellValue(dto.getAssignedToName());
                row.createCell(12).setCellValue(dto.getDeviceDetails());
                row.createCell(13)
                        .setCellValue(dto.getCreatedAt() != null ? dto.getCreatedAt().format(dateFormatter) : "");
                row.createCell(14)
                        .setCellValue(dto.getUpdatedAt() != null ? dto.getUpdatedAt().format(dateFormatter) : "");
                row.createCell(15).setCellValue(dto.getSlaStatus());
                row.createCell(16).setCellValue(dto.getDepartment());
                row.createCell(17).setCellValue(dto.getLocation());
            }

            // Auto size columns (optional, can be slow for large data)
            // for (int i = 0; i < commonHeaders.length; i++) {
            // sheet.autoSizeColumn(i);
            // }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (IOException e) {
            log.error("Failed to export data to Excel", e);
            throw new RuntimeException("Fail to import data to Excel file: " + e.getMessage());
        }
    }

    private Specification<Ticket> createSpecification(ReportFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getStartDate() != null && filter.getEndDate() != null) {
                predicates.add(cb.between(root.get("createdAt"), filter.getStartDate(), filter.getEndDate()));
            }

            if (filter.getManagerId() != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), filter.getManagerId()));
            }

            if (filter.getAssignedToId() != null) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), filter.getAssignedToId()));
            }

            if (filter.getEmployeeId() != null) {
                predicates.add(cb.equal(root.get("requester").get("id"), filter.getEmployeeId()));
            }

            if (filter.getCategory() != null) {
                predicates.add(cb.equal(root.get("category"), filter.getCategory()));
            }

            if (filter.getPriority() != null) {
                predicates.add(cb.equal(root.get("priority"), filter.getPriority()));
            }

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            if (filter.getManagerApprovalStatus() != null) {
                predicates.add(cb.equal(root.get("managerApprovalStatus"), filter.getManagerApprovalStatus()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public ByteArrayInputStream exportTicketsToCsv(ReportFilter filter) {
        Specification<Ticket> spec = createSpecification(filter);
        List<Ticket> tickets = ticketRepository.findAll(spec);

        if (tickets.size() > 10000) {
            tickets = tickets.subList(0, 10000);
            log.warn("Export limit reached. Truncating to 10000 rows.");
        }

        StringBuilder csv = new StringBuilder();
        // Header
        csv.append(
                "Ticket No,Title,Category,Sub-Category,Status,Manager Approval,Priority,Employee Name,Employee ID,Employee Email,Manager Name,Assigned To,Device Details,Created At,Updated At,SLA Status,Department,Location\n");

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Ticket ticket : tickets) {
            TicketReportDTO dto = TicketReportDTO.fromEntity(ticket);
            csv.append(escapeSpecialCharacters(dto.getTicketNumber())).append(",");
            csv.append(escapeSpecialCharacters(dto.getTitle())).append(",");
            csv.append(escapeSpecialCharacters(dto.getCategory())).append(",");
            csv.append(escapeSpecialCharacters(dto.getSubCategory())).append(",");
            csv.append(escapeSpecialCharacters(dto.getStatus())).append(",");
            csv.append(escapeSpecialCharacters(dto.getManagerApprovalStatus())).append(",");
            csv.append(escapeSpecialCharacters(dto.getPriority())).append(",");
            csv.append(escapeSpecialCharacters(dto.getEmployeeName())).append(",");
            csv.append(escapeSpecialCharacters(dto.getEmployeeId())).append(",");
            csv.append(escapeSpecialCharacters(dto.getEmployeeEmail())).append(",");
            csv.append(escapeSpecialCharacters(dto.getManagerName())).append(",");
            csv.append(escapeSpecialCharacters(dto.getAssignedToName())).append(",");
            csv.append(escapeSpecialCharacters(dto.getDeviceDetails())).append(",");
            csv.append(dto.getCreatedAt() != null ? dto.getCreatedAt().format(dateFormatter) : "").append(",");
            csv.append(dto.getUpdatedAt() != null ? dto.getUpdatedAt().format(dateFormatter) : "").append(",");
            csv.append(escapeSpecialCharacters(dto.getSlaStatus())).append(",");
            csv.append(escapeSpecialCharacters(dto.getDepartment())).append(",");
            csv.append(escapeSpecialCharacters(dto.getLocation())).append("\n");
        }

        return new ByteArrayInputStream(csv.toString().getBytes());
    }

    private String escapeSpecialCharacters(String data) {
        if (data == null) {
            return "";
        }
        String escapedData = data.replaceAll("\\R", " ");
        if (data.contains(",") || data.contains("\"") || data.contains("'")) {
            data = data.replace("\"", "\"\"");
            escapedData = "\"" + data + "\"";
        }
        return escapedData;
    }
}

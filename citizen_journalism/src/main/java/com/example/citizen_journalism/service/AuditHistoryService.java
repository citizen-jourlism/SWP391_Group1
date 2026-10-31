
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.audit.AuditHistoryItem;
import com.example.citizen_journalism.repository.AuditHistoryReadRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditHistoryService {

    private static final int MAX_EXPORT_ROWS = 10_000;
    private final AuditHistoryReadRepository repository;

    public PageResponse<AuditHistoryItem> search(
            String source,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size) {

        validate(source, from, to);

        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page >= 0, size từ 1 đến 100"
            );
        }

        long offset = (long) page * size;

        if (offset > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trang vượt giới hạn truy vấn"
            );
        }

        long count = repository.count(source, from, to);

        List<AuditHistoryItem> items =
                repository.list(source, from, to, (int) offset, size);

        int pages = (int) Math.min(
                Integer.MAX_VALUE,
                (count + size - 1) / size
        );

        return new PageResponse<>(items, page, size, count, pages);
    }

    public byte[] exportCsv(
            String source,
            LocalDateTime from,
            LocalDateTime to) {

        validate(source, from, to);

        long count = repository.count(source, from, to);

        if (count > MAX_EXPORT_ROWS) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quá 10000 dòng. Hãy thu hẹp bộ lọc ngày trước khi xuất."
            );
        }

        List<AuditHistoryItem> items =
                repository.list(source, from, to, 0, MAX_EXPORT_ROWS);

        StringBuilder out = new StringBuilder(
                "\uFEFFsource,id,occurredAt,actorRole,action,description,targetId\r\n"
        );

        for (AuditHistoryItem item : items) {
            out.append(csv(item.source())).append(',')
               .append(item.id()).append(',')
               .append(csv(item.occurredAt().toString())).append(',')
               .append(csv(item.actorRole())).append(',')
               .append(csv(item.action())).append(',')
               .append(csv(item.description())).append(',')
               .append(csv(item.targetId())).append("\r\n");
        }

        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void validate(
            String source,
            LocalDateTime from,
            LocalDateTime to) {

        if (source != null
                && !source.equals("SUBMISSION")
                && !source.equals("REPUTATION")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "source phải là SUBMISSION hoặc REPUTATION"
            );
        }

        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "from phải trước hoặc bằng to"
            );
        }
    }

    /** Quote CSV cells and prevent spreadsheet formula injection. */
    private String csv(String text) {
        String value = text == null ? "" : text;

        if (!value.isEmpty()
                && "=+-@".indexOf(value.charAt(0)) >= 0) {
            value = "'" + value;
        }

        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}

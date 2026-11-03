package com.example.citizen_journalism.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * SỬA NHỮNG CHỖ ddl-auto=update KHÔNG TỰ LÀM ĐƯỢC, chạy 1 lần mỗi khi backend khởi động (sau khi Hibernate tạo / thêm cột).
 * Nhờ vậy cả nhóm chỉ cần pull code và chạy lại backend, không phải tự chạy SQL.
 *
 * Hibernate update chỉ THÊM bảng / cột còn thiếu, không sửa cột đã có. Các cột dưới đây được tạo từ phiên bản cũ
 * nên phải sửa tay:
 *   - editorial_reviews.submission_id: bản cũ là NOT NULL, nhưng dòng duyệt bài nghiên cứu không gắn hồ sơ nào.
 *   - reputation_logs.reason, research_articles.status: bản cũ là kiểu ENUM của MySQL, chỉ nhận các giá trị lúc tạo
 *     bảng. Thêm lý do / trạng thái mới thì MySQL báo "Data truncated", nên đổi sang VARCHAR (entity cũng khai báo
 *     VARCHAR để DB mới tạo đúng ngay từ đầu).
 * Mỗi bước tự kiểm tra trước, đã đúng thì bỏ qua, nên chạy lại bao nhiêu lần cũng không sao.
 */
@Slf4j
@Component
@Order(-100)
@RequiredArgsConstructor
public class EditorialSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments arguments) {
        Integer notNull = jdbc.queryForObject("""
                select count(*) from information_schema.COLUMNS
                where TABLE_SCHEMA = database() and TABLE_NAME = 'editorial_reviews'
                  and COLUMN_NAME = 'submission_id' and IS_NULLABLE = 'NO'
                """, Integer.class);
        if (notNull != null && notNull > 0) {
            jdbc.execute("alter table editorial_reviews modify column submission_id bigint null");
            log.info("Đã cho phép editorial_reviews.submission_id để trống (dòng duyệt bài nghiên cứu).");
        }
        enumToVarchar("reputation_logs", "reason", 100);
        enumToVarchar("research_articles", "status", 20);
    }

    /** Cột đang là ENUM thì đổi sang VARCHAR(length) NOT NULL, giữ nguyên dữ liệu đang có. */
    private void enumToVarchar(String table, String column, int length) {
        Integer isEnum = jdbc.queryForObject("""
                select count(*) from information_schema.COLUMNS
                where TABLE_SCHEMA = database() and TABLE_NAME = ? and COLUMN_NAME = ? and DATA_TYPE = 'enum'
                """, Integer.class, table, column);
        if (isEnum != null && isEnum > 0) {
            // Tên bảng / cột là hằng số trong code (không đến từ người dùng) nên ghép chuỗi an toàn
            jdbc.execute("alter table " + table + " modify column " + column + " varchar(" + length + ") not null");
            log.info("Đã đổi {}.{} từ ENUM sang VARCHAR({}).", table, column, length);
        }
    }
}

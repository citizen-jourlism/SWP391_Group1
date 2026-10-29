package com.example.citizen_journalism.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * Tạo PageRequest (trang + số dòng + cách sắp xếp) cho các danh sách có phân trang
 * (quản lý tài khoản, "Thông tin đã gửi", hàng đợi Biên tập viên, đơn CTV, bài nghiên cứu...).
 *
 * TẠI SAO gom về 1 chỗ? Tham số page / size đến từ đường dẫn (?page=-1&size=99999 cũng gửi được),
 * nên chỗ nào cũng phải "kẹp" lại trong khoảng hợp lệ. Viết 1 lần ở đây thay vì lặp ở từng service.
 */
public final class Paging {

    /** Số dòng tối đa mỗi trang (chặn việc xin cả nghìn dòng một lúc làm chậm server). */
    public static final int MAX_SIZE = 50;

    /** Mới nhất trước. Thêm "id" để 2 dòng tạo cùng thời điểm vẫn có thứ tự cố định (không nhảy khi sang trang). */
    public static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    /** Cũ nhất trước: dùng cho hàng đợi "ai gửi trước được xử lý trước". */
    public static final Sort OLDEST_FIRST = Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));

    private Paging() {
    }

    /** page nhỏ hơn 0 -> 0; size kẹp trong khoảng 1..MAX_SIZE. */
    public static PageRequest of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_SIZE), sort);
    }
}

package com.example.citizen_journalism.security;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Đổi token JWT (đã được kiểm tra chữ ký + hạn dùng) thành "người đang đăng nhập" cho Spring Security,
 * VÀ đối chiếu với database ở MỖI request.
 *
 * TẠI SAO không tin hẳn vào nội dung token? Token được cấp lúc đăng nhập và dùng được tới 24 giờ (hoặc 7 ngày
 * nếu "Ghi nhớ đăng nhập"). Trong thời gian đó admin có thể:
 *   - KHOÁ tài khoản -> người bị khoá phải mất quyền ngay, không đợi token hết hạn;
 *   - ĐỔI VAI TRÒ (ví dụ thu hồi quyền Biên tập viên) -> quyền mới phải có hiệu lực ngay.
 * Vì vậy vai trò dùng để phân quyền lấy từ DATABASE (không lấy claim "role" trong token),
 * và tài khoản không còn ACTIVE thì bị từ chối (401) -> frontend tự đăng xuất (xem lib/api.js).
 *
 * Mỗi request tốn thêm 1 câu SELECT theo khoá chính (rất nhanh), đổi lại phân quyền luôn đúng.
 * Được gắn vào SecurityConfig (oauth2ResourceServer -> jwt -> jwtAuthenticationConverter).
 */
@Component
@RequiredArgsConstructor
public class ActiveUserJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        User user = userRepository.findById(jwt.getSubject())
                .filter(found -> found.getStatus() == User.Status.ACTIVE)
                // Ném lỗi xác thực -> RestAuthenticationHandler trả 401 "phiên đăng nhập đã hết hạn"
                .orElseThrow(() -> new InvalidBearerTokenException("Tài khoản không còn hoạt động"));
        // "ROLE_" + vai trò: để SecurityConfig viết được .hasRole("EDITOR")...
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        // Tham số thứ 3 = tên người dùng = mã người dùng (giống jwt.getSubject() mà controller đang dùng)
        return new JwtAuthenticationToken(jwt, authorities, user.getId());
    }
}

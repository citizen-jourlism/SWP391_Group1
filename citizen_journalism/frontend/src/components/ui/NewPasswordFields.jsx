import PasswordStrength from './PasswordStrength'
import TextField from './TextField'

/**
 * Cặp ô "Mật khẩu mới" (kèm thanh đo độ mạnh) + "Nhập lại mật khẩu".
 * Dùng chung ở: Đăng ký (Register.jsx), Đặt lại mật khẩu (ForgotPassword.jsx), Đổi mật khẩu (ChangePassword.jsx).
 *
 * TẠI SAO tách ra? Ba trang đều cần đúng khối này. Viết 1 lần thì giao diện luôn đồng bộ,
 * sửa 1 chỗ là cả 3 trang được cập nhật.
 *
 * Props:
 *   - form        : đối tượng trả về từ useForm() của trang cha
 *   - name        : tên ô mật khẩu trong form (mặc định 'password')
 *   - confirmName : tên ô nhập lại (mặc định 'confirmPassword')
 *   - label       : nhãn ô mật khẩu (ví dụ 'Mật khẩu mới')
 * Quy tắc kiểm tra tương ứng: newPasswordRules và confirmPasswordRules trong lib/validators.js.
 */
function NewPasswordFields({ form, name = 'password', confirmName = 'confirmPassword', label = 'Mật khẩu' }) {
  return (
    <>
      <TextField
        label={label}
        icon="lock"
        type="password"
        placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
        autoComplete="new-password" // Gợi ý trình duyệt đề xuất mật khẩu mạnh, không tự điền mật khẩu cũ
        required
        {...form.field(name)}
      >
        <PasswordStrength password={form.values[name]} />
      </TextField>

      <TextField
        label="Nhập lại mật khẩu"
        icon="lock"
        type="password"
        placeholder="Nhập lại mật khẩu ở trên"
        autoComplete="new-password"
        required
        {...form.field(confirmName)}
      />
    </>
  )
}

export default NewPasswordFields

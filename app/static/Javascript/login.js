const loginBox = document.getElementById("loginContainer");
const registerBox = document.getElementById("registerContainer");
const forgotBox = document.getElementById("forgotContainer");

document.getElementById("switch-to-register").onclick = function () {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
document.getElementById("switch-to-login").onclick = function () {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};
document.getElementById("switch-to-login-2").onclick = function () {
  forgotBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};
document.getElementById("forgotPassword").onclick = function () {
  loginBox.classList.add("hidden");
  forgotBox.classList.remove("hidden");
};
document.getElementById("switch-to-register-2").onclick = function () {
  forgotBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
// 🧿 Xử lý ẩn/hiện mật khẩu
document.querySelectorAll(".toggle-password").forEach((toggle) => {
  toggle.addEventListener("click", function () {
    const input = this.previousElementSibling; // input ngay trước icon

    if (input.type === "password") {
      input.type = "text";
      this.innerHTML = '<i class="fa-regular fa-eye"></i>';
    } else {
      input.type = "password";
      this.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    }
  });
});
// === ĐĂNG NHẬP ===

document
  .querySelector("#loginContainer form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#loginContainer #email").value;
    const password = document.querySelector("#loginContainer #password").value;

    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Nếu backend trả về redirect (theo role)
        if (result.redirect) {
          window.location.href = result.redirect;
        } else {
          window.location.href = "/home";
        }
      } else {
        alert("❌ " + result.message);
      }
    } catch (error) {
      alert("⚠️ Lỗi kết nối đến server!");
      console.error(error);
    }
  });

// === ĐĂNG KÝ ===
document
  .querySelector("#registerContainer form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name-reg").value;
    const username = document.getElementById("username-reg").value;
    const email = document.getElementById("email-reg").value;
    const sdt = document.getElementById("phonenumber-reg").value;
    const password = document.getElementById("password-reg").value;
    const repassword = document.getElementById("repassword-reg").value;

    if (password !== repassword) {
      alert("❌ Mật khẩu nhập lại không khớp!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, sdt, password }),
      });

      const result = await response.json();

      if (result.success) {
        alert("🎉 " + result.message);
        document.getElementById("registerContainer").classList.add("hidden");
        document.getElementById("loginContainer").classList.remove("hidden");
      } else {
        alert("❌ " + result.message);
      }
    } catch (error) {
      alert("⚠️ Lỗi kết nối đến server!");
      console.error(error);
    }
  });

// === QUÊN MẬT KHẨU ===
// === GỬI OTP ===
async function sendOTP() {
  const email_or_phone =
    document.getElementById("email_or_phone")?.value?.trim() ||
    document.getElementById("name-for")?.value?.trim();
  if (!email_or_phone)
    return alert("⚠️ Vui lòng nhập email hoặc số điện thoại!");

  try {
    const res = await fetch("http://127.0.0.1:5000/forgot/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_or_phone }),
    });
    const data = await res.json();
    alert(data.message);

    if (data.success) {
      // hiện phần nhập OTP
      document.getElementById("otp-section").style.display = "block";
    }
  } catch (err) {
    alert("⚠️ Không thể kết nối tới server!");
    console.error(err);
  }
}

// === XÁC NHẬN OTP & ĐỔI MẬT KHẨU ===
async function verifyOTP() {
  const otp = document.getElementById("otp").value.trim();
  const new_pass = document.getElementById("forgot-password").value.trim();
  const confirm = document
    .getElementById("forgot-password-confirm")
    .value.trim();

  if (!otp || !new_pass || !confirm)
    return alert("⚠️ Vui lòng nhập đủ thông tin!");
  if (new_pass !== confirm) return alert("❌ Mật khẩu xác nhận không khớp!");

  try {
    const res = await fetch("http://127.0.0.1:5000/forgot/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp, new_pass }),
    });
    const data = await res.json();
    alert(data.message);

    if (data.success) {
      document.getElementById("forgotContainer").classList.add("hidden");
      document.getElementById("loginContainer").classList.remove("hidden");
    }
  } catch (err) {
    alert("⚠️ Không thể kết nối tới server!");
    console.error(err);
  }
}

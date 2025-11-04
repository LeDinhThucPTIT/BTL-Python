console.log("📚 save.js loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const saveContainer = document.querySelector(".save-container");

  try {
    const res = await fetch("/api/saves");
    const data = await res.json();

    if (!res.ok || data.error) {
      saveContainer.innerHTML = `<p class="empty-save">Bạn chưa đăng nhập hoặc chưa có sách lưu.</p>`;
      return;
    }

    if (data.length === 0) {
      saveContainer.innerHTML = `<p class="empty-save">Bạn chưa lưu hoặc yêu thích quyển sách nào.</p>`;
      return;
    }

    // ✅ Render danh sách sách
    saveContainer.innerHTML = data
      .map((book) => {
        const cover =
          book.cover_image || "/static/images/Book/default_cover.jpg";
        const author = book.author || "Không rõ";

        // Hiển thị icon theo loại
        const icon =
          book.type === "favorite"
            ? `<img src="${window.STATIC_URL}images/Logo/Button Heart.png" alt="favorite" class="book-save-heart favorite-icon" data-type="favorite">`
            : `<img src="${window.STATIC_URL}images/Logo/Button save.png" alt="save" class="book-save-heart save-icon" data-type="save">`;

        return `
        <div class="book-save" data-book-id="${book.book_id}" data-type="${book.type}">
          <div class="book-img">
            <img src="${cover}" alt="${book.title}" class="book-save-img" />
            ${icon}
            <button class="remove-save" title="Xoá khỏi lưu trữ">
              <i class="fa-solid fa-xmark" style="position:absolute;top:10px;left:10px;font-size:20px;color:#fff;cursor:pointer;"></i>
            </button>
          </div>
          <div class="book-save-info">
            <h4 class="book-save-title">${book.title}</h4>
            <p class="book-save-author">${author}</p>
          </div>
        </div>
        `;
      })
      .join("");

    // 🗑 Xử lý xóa
    document.querySelectorAll(".remove-save").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const parent = btn.closest(".book-save");
        const bookId = parent.dataset.bookId;
        const type = parent.dataset.type; // 'save' hoặc 'favorite'

        try {
          // Gửi yêu cầu xóa đến đúng API
          const endpoint =
            type === "favorite" ? "/api/favorites/remove" : "/api/saves/remove";

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: bookId }),
          });

          const result = await res.json();

          if (res.ok && result.success) {
            // Xóa khỏi giao diện mượt
            parent.style.opacity = 0;
            setTimeout(() => parent.remove(), 300);
            console.log(`🗑 Đã xoá ${type} book_id=${bookId}`);
          } else {
            alert("❌ Không thể xoá khỏi danh sách!");
          }
        } catch (err) {
          console.error("Lỗi xoá sách:", err);
          alert("⚠️ Lỗi khi xoá khỏi danh sách!");
        }
      });
    });
  } catch (err) {
    console.error("❌ Lỗi load danh sách:", err);
    saveContainer.innerHTML = `<p class="error">Không thể tải danh sách lưu.</p>`;
  }
});

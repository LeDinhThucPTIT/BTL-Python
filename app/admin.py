from flask import Blueprint, render_template, request, redirect, url_for, session, flash, current_app
import mysql.connector
import os
from werkzeug.utils import secure_filename

# --------------------------
# ⚙️ Tạo Blueprint admin
# --------------------------
admin_bp = Blueprint("admin", __name__, url_prefix="/admin", template_folder="templates")


# --------------------------
# 💾 Kết nối Database
# --------------------------
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456",
        database="bookapp",
        autocommit=True
    )


# --------------------------
# 📂 Cấu hình upload
# --------------------------
def get_upload_folder():
    folder = os.path.join(current_app.root_path, 'static', 'images', 'Book')
    os.makedirs(folder, exist_ok=True)
    return folder


# --------------------------
# 🔐 Trang đăng nhập admin
# --------------------------
@admin_bp.route("/login_admin", methods=["GET", "POST"])
def login_admin():
    # ✅ Nếu đã đăng nhập rồi -> đi thẳng vào dashboard
    if "admin_id" in session:
        return redirect(url_for("admin.dashboard"))

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s AND password=%s AND role='admin'", (email, password))
        admin = cursor.fetchone()

        if admin:
            session["admin_id"] = admin["id"]
            session["admin_name"] = admin["username"]
            flash("Đăng nhập thành công!", "success")
            return redirect(url_for("admin.dashboard"))  # ✅ Chuyển luôn vào dashboard
        else:
            flash("Sai tài khoản hoặc không phải admin!", "danger")

    return render_template("admin/login.html")


# --------------------------
# 🚪 Đăng xuất admin
# --------------------------
@admin_bp.route("/logout")
def logout_admin():
    session.clear()
    return redirect(url_for("admin.login_admin"))


# --------------------------
# 📊 Trang tổng quan
# --------------------------
@admin_bp.route("/dashboard")
def dashboard():
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS total_books FROM books")
    total_books = cur.fetchone()["total_books"]

    cur.execute("SELECT COUNT(*) AS total_users FROM users")
    total_users = cur.fetchone()["total_users"]

    cur.execute("SELECT COUNT(*) AS total_comments FROM comments")
    total_comments = cur.fetchone()["total_comments"]

    cur.execute("SELECT COUNT(*) AS total_reads FROM reading_history")
    total_reads = cur.fetchone()["total_reads"]

    return render_template(
        "admin/dashboard.html",
        total_books=total_books,
        total_users=total_users,
        total_comments=total_comments,
        total_reads=total_reads
    )


# --------------------------
# 📚 Quản lý sách
# --------------------------
@admin_bp.route("/books")
def books():
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM books ORDER BY created_at DESC")
    books = cur.fetchall()
    return render_template("admin/books.html", books=books)


@admin_bp.route("/books/add", methods=["GET", "POST"])
def add_book():
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    if request.method == "POST":
        title = request.form.get("title")
        author = request.form.get("author")
        genre = request.form.get("genre")
        summary = request.form.get("summary")
        cover = request.files.get("cover")
        book_file = request.files.get("book_file")

        upload_folder = get_upload_folder()
        cover_path = None
        book_path = None

        # Ảnh bìa
        if cover and cover.filename:
            filename = secure_filename(cover.filename)
            cover.save(os.path.join(upload_folder, filename))
            cover_path = f"/static/images/Book/{filename}"

        # File sách
        if book_file and book_file.filename:
            book_filename = secure_filename(book_file.filename)
            book_folder = os.path.join(current_app.root_path, 'static', 'books')
            os.makedirs(book_folder, exist_ok=True)
            book_file.save(os.path.join(book_folder, book_filename))
            book_path = f"/static/books/{book_filename}"

        db = get_db()
        cur = db.cursor()
        cur.execute("""
            INSERT INTO books (title, author, genre, summary, cover_image, file_path, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (title, author, genre, summary, cover_path, book_path, session["admin_id"]))
        db.commit()

        flash("📘 Thêm sách thành công!", "success")
        return redirect(url_for("admin.books"))

    return render_template("admin/add_book.html")


@admin_bp.route("/books/delete/<int:id>")
def delete_book(id):
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM books WHERE id=%s", (id,))
    db.commit()
    flash("🗑️ Đã xoá sách!", "warning")
    return redirect(url_for("admin.books"))


# --------------------------
# 👥 Quản lý người dùng
# --------------------------
@admin_bp.route("/users")
def users():
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id, username, email, role FROM users ORDER BY id DESC")
    users = cur.fetchall()
    return render_template("admin/users.html", users=users)


@admin_bp.route("/users/delete/<int:id>")
def delete_user(id):
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM users WHERE id=%s", (id,))
    db.commit()
    flash("🧍‍♂️ Đã xoá người dùng!", "warning")
    return redirect(url_for("admin.users"))


# --------------------------
# 💬 Quản lý bình luận
# --------------------------
@admin_bp.route("/comments")
def comments():
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("""
        SELECT c.id, c.content, c.created_at, u.username, b.title
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        ORDER BY c.created_at DESC
    """)
    comments = cur.fetchall()
    return render_template("admin/comments.html", comments=comments)


@admin_bp.route("/comments/delete/<int:id>")
def delete_comment(id):
    if "admin_id" not in session:
        return redirect(url_for("admin.login_admin"))

    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM comments WHERE id=%s", (id,))
    db.commit()
    flash("💬 Đã xoá bình luận!", "warning")
    return redirect(url_for("admin.comments"))

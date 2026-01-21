from flask import Flask, render_template, request, redirect, url_for, flash
import psycopg2

app = Flask(__name__)
app.secret_key = '111'  # Для повідомлень Flash

# Конфігурація бази даних
DB_CONFIG = {
    'dbname': 'it2025practice13',
    'user': 'postgres',
    'password': 'admin',
    'host': 'localhost',
    'port': 5432
}

# Функція для підключення до бази даних
def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# Головна сторінка (Read)
@app.route('/')
def index():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, surname, rank, position FROM personal order by id")
    records = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('index.html', records=records)

# Сторінка для створення запису (Create)
@app.route('/create', methods=['GET', 'POST'])
def create():
    if request.method == 'POST':
        name = request.form['name']
        surname = request.form['surname']
        rank = request.form['rank']
        position = request.form['position']

        if not all([name, surname, rank, position]):
            flash('All fields are required!', 'error')
            return redirect(url_for('create'))

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO personal (name, surname, rank, position) VALUES (%s, %s, %s, %s)",
            (name, surname, rank, position)
        )
        conn.commit()
        cur.close()
        conn.close()
        flash('Record created successfully!', 'success')
        return redirect(url_for('index'))

    return render_template('create.html')

# Сторінка для редагування запису (Update)
@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit(id):
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == 'POST':
        name = request.form['name']
        surname = request.form['surname']
        rank = request.form['rank']
        position = request.form['position']

        if not all([name, surname, rank, position]):
            flash('All fields are required!', 'error')
            return redirect(url_for('edit', id=id))

        cur.execute(
            "UPDATE personal SET name = %s, surname = %s, rank = %s, position = %s WHERE id = %s",
            (name, surname, rank, position, id)
        )
        conn.commit()
        cur.close()
        conn.close()
        flash('Record updated successfully!', 'success')
        return redirect(url_for('index'))

    cur.execute("SELECT id, name, surname, rank, position FROM personal WHERE id = %s", (id,))
    record = cur.fetchone()
    cur.close()
    conn.close()
    return render_template('edit.html', record=record)

# Видалення запису (Delete)
@app.route('/delete/<int:id>', methods=['POST'])
def delete(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM personal WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    flash('Record deleted successfully!', 'success')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)

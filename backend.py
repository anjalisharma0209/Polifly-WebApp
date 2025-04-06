from flask import Flask, render_template, redirect, request, url_for, session, flash
import sqlite3, bcrypt
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.secret_key = 'secret'
db = SQLAlchemy(app)

# ------------ User Model ------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))

    def __init__(self, name, email, password):
        self.name = name
        self.email = email
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

# ------------ DB Init ------------
with app.app_context():
    db.create_all()

def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            option1 TEXT NOT NULL,
            option2 TEXT NOT NULL,
            option3 TEXT,
            created_by TEXT,
            votes1 INTEGER DEFAULT 0,
            votes2 INTEGER DEFAULT 0,
            votes3 INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def delete_anonymous_polls():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("DELETE FROM polls WHERE created_by = 'anonymous'")
    conn.commit()
    conn.close()

def init_vote_tracking():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS voted_polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            poll_id INTEGER,
            FOREIGN KEY (poll_id) REFERENCES polls (id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()
delete_anonymous_polls()
init_vote_tracking()

# ------------ Routes ------------

@app.route("/")
def landing():
    return render_template('landing.html')

@app.route("/index/")
def index():
    username = session.get('username')
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT * FROM polls')
    polls = c.fetchall()

    voted_ids = []
    if username:
        c.execute('SELECT poll_id FROM voted_polls WHERE username=?', (username,))
        voted_ids = [row[0] for row in c.fetchall()]
    conn.close()

    return render_template('index.html', polls=polls, voted_ids=voted_ids, username=username)

@app.route("/auth/", methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form['action']
        if action == 'signup':
            name = request.form['name']
            email = request.form['email']
            password = request.form['password']
            if User.query.filter_by(email=email).first():
                flash("Email already registered.")
                return redirect(url_for('auth'))

            user = User(name=name, email=email, password=password)
            db.session.add(user)
            db.session.commit()
            flash("Sign up successful! Please login.")
            return redirect(url_for('auth'))

        elif action == 'signin':
            email = request.form['email']
            password = request.form['password']
            user = User.query.filter_by(email=email).first()
            if user and user.check_password(password):
                session['username'] = user.name
                return redirect(url_for('index'))
            else:
                flash("Invalid email or password")
                return redirect(url_for('auth'))

    return render_template('auth.html')

@app.route('/submit_poll', methods=['POST'])
def submit_poll():
    question = request.form['pollQuestion']
    option1 = request.form['option1']
    option2 = request.form['option2']
    option3 = request.form.get('option3') or ''
    created_by = session.get('username', 'anonymous')

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO polls(question, option1, option2, option3, created_by)
        VALUES (?, ?, ?, ?, ?)''', (question, option1, option2, option3, created_by))
    conn.commit()
    conn.close()
    return redirect(url_for('index'))

@app.route('/delete_poll/<int:poll_id>', methods=['POST'])
def delete_poll(poll_id):
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("SELECT created_by FROM polls WHERE id=?", (poll_id,))
    poll = c.fetchone()
    if poll and poll[0] == session.get('username'):
        c.execute("DELETE FROM polls WHERE id=?", (poll_id,))
        conn.commit()
    conn.close()
    return redirect(url_for('index'))

@app.route("/logout/")
def logout():
    session.pop('username', None)
    flash("Logged out successfully.")
    return redirect(url_for('landing'))

@app.route("/about/")
def about():
    return render_template('about-us.html')

@app.route("/create_poll/")
def create_poll():
    return render_template('create-poll.html')

@app.route("/my_polls/")
def my_polls():
    username = session.get('username')
    if not username:
        flash("Please login to view your polls.")
        return redirect(url_for('auth'))

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT * FROM polls WHERE created_by = ?', (username,))
    my_polls_data = c.fetchall()
    conn.close()

    return render_template('my-polls.html', my_polls=my_polls_data, username=username)

@app.route('/vote/<int:poll_id>/<int:option>', methods=['POST'])
def vote(poll_id, option):
    username = session.get('username')
    if not username:
        flash("Login required to vote.")
        return redirect(url_for('auth'))

    # ✅ Validate option
    if option not in [1, 2, 3]:
        flash("Invalid vote option.")
        return redirect(url_for('index'))

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT * FROM voted_polls WHERE username = ? AND poll_id = ?', (username, poll_id))
    if c.fetchone():
        flash("You already voted on this poll.")
        return redirect(url_for('index'))

    column = f'votes{option}'
    c.execute(f'UPDATE polls SET {column} = {column} + 1 WHERE id=?', (poll_id,))
    c.execute('INSERT INTO voted_polls (username, poll_id) VALUES (?, ?)', (username, poll_id))
    conn.commit()
    conn.close()
    return redirect(url_for('index'))

@app.route("/voted_polls/")
def voted_polls():
    username = session.get('username')
    if not username:
        flash("Please login to view voted polls.")
        return redirect(url_for('auth'))

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        SELECT polls.* FROM polls
        INNER JOIN voted_polls ON polls.id = voted_polls.poll_id
        WHERE voted_polls.username = ?
    ''', (username,))
    voted_polls_data = c.fetchall()
    conn.close()

    return render_template('voted-polls.html', voted_polls=voted_polls_data, username=username)

# ------------ Run App ------------
if __name__ == '__main__':
    app.run(debug=True)

from flask import Flask, render_template, redirect

app = Flask(__name__)

@app.route("/")
def landing():
    return render_template('landing.html')

@app.route("/index/")
def index():
    return render_template('index.html')

@app.route("/about/")
def about():
    return render_template('about-us.html')

@app.route("/bookmarks/")
def bookmarks():
    return render_template('bookmarks.html')

@app.route("/create_poll/")
def create_poll():
    return render_template('create-poll.html')

@app.route("/login/")
def login():
    return render_template('login.html')

@app.route("/my_polls/")
def my_polls():
    return render_template('my-polls.html')

@app.route("/voted_polls/")
def voted_polls():
    return render_template('voted-polls.html')

@app.route("/youtube_cs/")
def youtube_cs():
    return render_template('youtube-cs.html')

@app.route("/youtube_mechanical/")
def youtube_mechanical():
    return render_template('youtube-mechanical.html')

@app.route("/youtube_videos/")
def youtube_videos():
    return render_template('youtube-videos.html')

app.run(debug=True)
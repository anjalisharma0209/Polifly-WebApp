// User Management
class UserManager {
    static currentUser = null;

    static login(username) {
        this.currentUser = username;
        localStorage.setItem('currentUser', username);
        // Set default profile picture if none exists
        if (!localStorage.getItem(`profilePicture_${username}`)) {
            localStorage.setItem(`profilePicture_${username}`, 'https://via.placeholder.com/100');
        }
        this.updateAuthLink();
        this.updateProfileCard();
        window.location.href = 'index.html';
    }

    static logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('polls');
        this.updateAuthLink();
        this.updateProfileCard();
        window.location.href = 'index.html';
    }

    static checkLogin() {
        this.currentUser = localStorage.getItem('currentUser');
        this.updateAuthLink();
        this.updateProfileCard();
        return this.currentUser !== null;
    }

    static updateAuthLink() {
        const authLink = document.getElementById('authLink');
        if (authLink) {
            authLink.textContent = this.currentUser ? `🚪 Logout (${this.currentUser})` : '🚪Login';
            authLink.href = 'javascript:void(0);';
            authLink.onclick = this.currentUser ? () => this.logout() : () => window.location.href = '/auth';
        }
    }

    static updateProfileCard() {
        const profileCard = document.getElementById('profileCard');
        const profileUsername = document.getElementById('profileUsername');
        const profileHandle = document.getElementById('profileHandle');
        const pollsCreated = document.getElementById('pollsCreated');
        const pollsVoted = document.getElementById('pollsVoted');
        const profilePic = document.getElementById('profilePic');

        if (profileCard && profileUsername && profileHandle && pollsCreated) {
            if (this.currentUser) {
                profileCard.style.display = 'block';
                profileUsername.textContent = this.currentUser;
                profileHandle.textContent = `@${this.currentUser}`;
                pollsCreated.textContent = PollManager.polls.filter(poll => poll.creator === this.currentUser).length;
                if (pollsVoted) {
                    pollsVoted.textContent = PollManager.polls.filter(poll => poll.voters.includes(this.currentUser)).length;
                }
                if (profilePic) {
                    profilePic.src = localStorage.getItem(`profilePicture_${this.currentUser}`) || 'https://via.placeholder.com/100';
                }
            } else {
                profileCard.style.display = 'none';
            }
        }
    }

    static updateProfilePicture(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            localStorage.setItem(`profilePicture_${this.currentUser}`, imageUrl);
            this.updateProfileCard();
            PollManager.renderPolls();
            PollManager.renderMyPolls();
            PollManager.renderVotedPolls();
        };
        reader.readAsDataURL(file);
    }
}

// Poll Management
class PollManager {
    static polls = JSON.parse(localStorage.getItem('polls')) || [];

    static addPoll(question, options, creator) {
        const poll = {
            id: Date.now(),
            question,
            options: options.map(opt => ({ text: opt, votes: 0 })),
            creator,
            createdAt: new Date().toLocaleString(),
            comments: [],
            voters: []
        };
        this.polls.unshift(poll);
        localStorage.setItem('polls', JSON.stringify(this.polls));
        this.renderPolls();
        this.renderMyPolls();
        this.renderVotedPolls();
        UserManager.updateProfileCard();
    }

    static vote(pollId, optionIndex, voter) {
        const poll = this.polls.find(p => p.id === pollId);
        if (poll && !poll.voters.includes(voter)) {
            poll.options[optionIndex].votes++;
            poll.voters.push(voter);
            localStorage.setItem('polls', JSON.stringify(this.polls));
            this.renderPolls();
            this.renderMyPolls();
            this.renderVotedPolls();
            UserManager.updateProfileCard();
        }
    }

    static addComment(pollId, commentText, commenter) {
        const poll = this.polls.find(p => p.id === pollId);
        if (poll) {
            poll.comments.push({ text: commentText, commenter, timestamp: new Date().toLocaleString() });
            localStorage.setItem('polls', JSON.stringify(this.polls));
            this.renderPolls();
            this.renderMyPolls();
            this.renderVotedPolls();
        }
    }

    static renderPolls() {
        const container = document.getElementById('pollsContainer');
        const loginPrompt = document.getElementById('loginPrompt');
        if (!container) return;

        container.innerHTML = '';
        this.polls.forEach(poll => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            const pollCard = document.createElement('div');
            pollCard.className = 'poll-card card';
            pollCard.innerHTML = `
                <div class="poll-header">
                    <img src="${localStorage.getItem(`profilePicture_${poll.creator}`) || 'https://via.placeholder.com/40'}" alt="Profile" class="profile-pic-small">
                    <div class="poll-info">
                        <span class="username">${poll.creator}</span>
                        <span class="timestamp">${poll.createdAt}</span>
                    </div>
                    ${UserManager.currentUser && poll.voters.includes(UserManager.currentUser) ? '<span class="voted">Voted</span>' : ''}
                </div>
                <h3>${poll.question}</h3>
                <div class="poll-options">
                    ${poll.options.map((opt, index) => {
                        const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
                        return `
                            <div class="option">
                                <span>${opt.text}</span>
                                <div class="progress-bar" style="width: ${percentage}%;"></div>
                                <span>${percentage}%</span>
                                ${UserManager.currentUser && !poll.voters.includes(UserManager.currentUser) ? `
                                    <button class="vote-btn" data-poll-id="${poll.id}" data-option-index="${index}">Vote</button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${UserManager.currentUser ? `
                    <div class="comment-section">
                        <input type="text" class="comment-input" placeholder="Add a comment..." data-poll-id="${poll.id}">
                        <button class="btn comment-btn" data-poll-id="${poll.id}">Comment</button>
                    </div>
                    <div class="comments-list">
                        ${poll.comments.map(comment => `
                            <div class="comment">
                                <span class="username">${comment.commenter}</span>
                                <p>${comment.text}</p>
                                <span class="timestamp">${comment.timestamp}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            container.appendChild(pollCard);
        });

        if (loginPrompt) {
            loginPrompt.style.display = UserManager.currentUser ? 'none' : 'block';
        }

        this.attachEventListeners();
    }

    static renderMyPolls() {
        const container = document.getElementById('myPollsContainer');
        const loginPrompt = document.getElementById('loginPrompt');
        if (!container) return;

        container.innerHTML = '';
        const userPolls = this.polls.filter(poll => poll.creator === UserManager.currentUser);
        if (userPolls.length === 0 && UserManager.currentUser) {
            container.innerHTML = '<p>No polls created yet. Start by creating one!</p>';
        } else {
            userPolls.forEach(poll => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                const pollCard = document.createElement('div');
                pollCard.className = 'poll-card card';
                pollCard.innerHTML = `
                    <div class="poll-header">
                        <img src="${localStorage.getItem(`profilePicture_${poll.creator}`) || 'https://via.placeholder.com/40'}" alt="Profile" class="profile-pic-small">
                        <div class="poll-info">
                            <span class="username">${poll.creator}</span>
                            <span class="timestamp">${poll.createdAt}</span>
                        </div>
                        ${UserManager.currentUser && poll.voters.includes(UserManager.currentUser) ? '<span class="voted">Voted</span>' : ''}
                    </div>
                    <h3>${poll.question}</h3>
                    <div class="poll-options">
                        ${poll.options.map((opt, index) => {
                            const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
                            return `
                                <div class="option">
                                    <span>${opt.text}</span>
                                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                                    <span>${percentage}%</span>
                                    ${UserManager.currentUser && !poll.voters.includes(UserManager.currentUser) ? `
                                        <button class="vote-btn" data-poll-id="${poll.id}" data-option-index="${index}">Vote</button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${UserManager.currentUser ? `
                        <div class="comment-section">
                            <input type="text" class="comment-input" placeholder="Add a comment..." data-poll-id="${poll.id}">
                            <button class="btn comment-btn" data-poll-id="${poll.id}">Comment</button>
                        </div>
                        <div class="comments-list">
                            ${poll.comments.map(comment => `
                                <div class="comment">
                                    <span class="username">${comment.commenter}</span>
                                    <p>${comment.text}</p>
                                    <span class="timestamp">${comment.timestamp}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;
                container.appendChild(pollCard);
            });
        }

        if (loginPrompt) {
            loginPrompt.style.display = UserManager.currentUser ? 'none' : 'block';
        }

        this.attachEventListeners();
    }

    static renderVotedPolls() {
        const container = document.getElementById('votedPollsContainer');
        const loginPrompt = document.getElementById('loginPrompt');
        if (!container) return;

        container.innerHTML = '';
        const votedPolls = this.polls.filter(poll => poll.voters.includes(UserManager.currentUser));
        if (votedPolls.length === 0 && UserManager.currentUser) {
            container.innerHTML = '<p>You haven’t voted on any polls yet.</p>';
        } else {
            votedPolls.forEach(poll => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                const pollCard = document.createElement('div');
                pollCard.className = 'poll-card card';
                pollCard.innerHTML = `
                    <div class="poll-header">
                        <img src="${localStorage.getItem(`profilePicture_${poll.creator}`) || 'https://via.placeholder.com/40'}" alt="Profile" class="profile-pic-small">
                        <div class="poll-info">
                            <span class="username">${poll.creator}</span>
                            <span class="timestamp">${poll.createdAt}</span>
                        </div>
                        <span class="voted">Voted</span>
                    </div>
                    <h3>${poll.question}</h3>
                    <div class="poll-options">
                        ${poll.options.map(opt => {
                            const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
                            return `
                                <div class="option">
                                    <span>${opt.text}</span>
                                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                                    <span>${percentage}%</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="comment-section">
                        <input type="text" class="comment-input" placeholder="Add a comment..." data-poll-id="${poll.id}">
                        <button class="btn comment-btn" data-poll-id="${poll.id}">Comment</button>
                    </div>
                    <div class="comments-list">
                        ${poll.comments.map(comment => `
                            <div class="comment">
                                <span class="username">${comment.commenter}</span>
                                <p>${comment.text}</p>
                                <span class="timestamp">${comment.timestamp}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.appendChild(pollCard);
            });
        }

        if (loginPrompt) {
            loginPrompt.style.display = UserManager.currentUser ? 'none' : 'block';
        }

        this.attachEventListeners();
    }

    static attachEventListeners() {
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollId = parseInt(btn.getAttribute('data-poll-id'));
                const optionIndex = parseInt(btn.getAttribute('data-option-index'));
                PollManager.vote(pollId, optionIndex, UserManager.currentUser);
            });
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollId = parseInt(btn.getAttribute('data-poll-id'));
                const input = document.querySelector(`.comment-input[data-poll-id="${pollId}"]`);
                const commentText = input.value.trim();
                if (commentText) {
                    PollManager.addComment(pollId, commentText, UserManager.currentUser);
                    input.value = '';
                }
            });
        });
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    UserManager.checkLogin();
    PollManager.renderPolls();
    PollManager.renderMyPolls();
    PollManager.renderVotedPolls();

    // Create Poll Popup (Global across all pages)
    const createPollBtns = document.querySelectorAll('.create-poll-btn');
    const popup = document.getElementById('createPollPopup');
    const pollForm = document.getElementById('pollForm');

    if (createPollBtns && popup) {
        createPollBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!UserManager.currentUser) {
                    alert('Please login to create a poll!');
                    window.location.href = 'login.html';
                    return;
                }
                popup.classList.add('active');
            });
        });
    }

    if (pollForm) {
        pollForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = document.getElementById('pollQuestion').value;
            const options = [
                document.getElementById('option1').value,
                document.getElementById('option2').value,
                document.getElementById('option3').value
            ].filter(opt => opt.trim() !== '');
            PollManager.addPoll(question, options, UserManager.currentUser);
            popup.classList.remove('active');
            pollForm.reset();
            window.location.href = 'index.html';
        });
    }

    // Profile Picture Update
    const updatePicBtn = document.getElementById('updatePicBtn');
    const profilePicUpload = document.getElementById('profilePicUpload');
    if (updatePicBtn && profilePicUpload) {
        updatePicBtn.addEventListener('click', () => {
            profilePicUpload.click();
        });
        profilePicUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                UserManager.updateProfilePicture(file);
            }
        });
    }



    // // Login/Signup Forms
    // const signInForm = document.getElementById('signInForm');
    // const signUpForm = document.getElementById('signUpForm');

    // if (signInForm) {
    //     signInForm.addEventListener('submit', (e) => {
    //         e.preventDefault();
    //         const email = document.getElementById('signInEmail').value;
    //         const username = email.split('@')[0];
    //         UserManager.login(username);
    //     });
    // }

//     if (signUpForm) {
//         signUpForm.addEventListener('submit', (e) => {
//             e.preventDefault();
//             const username = document.getElementById('signUpUsername').value;
//             UserManager.login(username);
//         });
//     }
// });

function toggleForm() {
    const container = document.querySelector('.container');
    container.classList.toggle('active');
}
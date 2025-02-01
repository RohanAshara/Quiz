let currentQuestion = 0;
let score = 0;
let questions = [];
let username = '';
let category = '';
let highScore = 0;
let isHighScoreVisible = false;



// Function to load the quiz data from the API
function loadQuiz() {
    fetch(`https://opentdb.com/api.php?amount=20&category=${category}&difficulty=easy&type=multiple`)
        .then(response => response.json())
        .then(data => {
            questions = data.results;
            displayQuestion();
        });
}

// Function to display the current question and answers
function displayQuestion() {
    const question = document.getElementById('question');
    const answers = document.getElementById('answers');
    const nextButton = document.getElementById('next-button');
    const questionNumber = document.getElementById('question-number');

    question.innerHTML = '';
    answers.innerHTML = '';
    nextButton.style.display = 'none';

    questionNumber.innerText = `Question ${currentQuestion + 1} of ${questions.length}`;
    question.innerText = questions[currentQuestion].question;

    const options = [...questions[currentQuestion].incorrect_answers, questions[currentQuestion].correct_answer];
    options.sort(() => Math.random() - 0.5);

    options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option;
        button.addEventListener('click', () => selectAnswer(button, option));
        answers.appendChild(button);
    });
}

function selectAnswer(button, selectedAnswer) {
    const nextButton = document.getElementById('next-button');
    const allButtons = document.querySelectorAll('#answers button');
    allButtons.forEach(btn => btn.disabled = true); // Disable all buttons once an answer is selected

    if (selectedAnswer === questions[currentQuestion].correct_answer) {
        score++;
        button.style.backgroundColor = '#28a745'; // Green for correct answer
    } else {
        button.style.backgroundColor = '#dc3545'; // Red for wrong answer

        // Highlight the correct answer in green
        allButtons.forEach(btn => {
            if (btn.innerText === questions[currentQuestion].correct_answer) {
                btn.style.backgroundColor = '#28a745'; // Green for the correct answer
            }
        });
    }

    nextButton.innerText = currentQuestion === questions.length - 1 ? 'Finish' : 'Next Question';
    nextButton.style.display = 'block';
}


function nextQuestion() {
    // Check if it's the last question
    if (currentQuestion === questions.length - 1) {
        showResults();  // Trigger the final score display when "Finish" is clicked
    } else {
        currentQuestion++;
        displayQuestion();
    }
}

// Function to show the final results when "Finish" is clicked
function showResults() {
    const quizSection = document.getElementById('quiz-section');
    let isNewHighScore = false;

    if (score > highScore) {
        isNewHighScore = true;
        highScore = score;
        saveHighScore(username, highScore);  // Update the high score if it's a new high
    }

    quizSection.innerHTML = `
        <h2>${username}, your final score is: ${score}/${questions.length}</h2>
        ${isNewHighScore ? `<h3>Congratulations! New High Score: ${highScore}</h3>`
            : `<h3>Your current high score is: ${highScore}</h3>`}
        <button id="show-highscores-btn">Show High Scores</button>
    `;

    document.getElementById('show-highscores-btn').addEventListener('click', displayHighScores);
}

// Function to start the quiz
function startQuiz() {
    username = document.getElementById('username').value;
    category = document.getElementById('category').value;

    if (!username) {
        alert('Please enter your username.');
        return;
    }

    // Fetch the user's high score if they exist in the database
    fetch(`http://localhost:3000/highscores?username=${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                // User exists, retrieve their current high score
                highScore = data[0].score;
            } else {
                // New user, set high score to 0
                highScore = 0;
            }

            document.getElementById('welcome-message').innerText = `Welcome, ${username}! Your high score is: ${highScore}`;

            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('quiz-section').style.display = 'block';
            loadQuiz();
        });
}

// Function to save the high score to the server
function saveHighScore(username, score) {
    // Check if the user already has a score entry
    fetch(`http://localhost:3000/highscores?username=${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                // If the user exists, update the score and category
                const userId = data[0].id; // Get the existing user ID
                fetch(`http://localhost:3000/highscores/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, category, score }) // Include category in update
                });
            } else {
                // If the user does not exist, create a new entry
                fetch('http://localhost:3000/highscores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, category, score })
                });
            }
        });
}


// Function to load and display high scores with toggle visibility

// Function to load and display high scores
function displayHighScores() {
    const highScoresSection = document.getElementById('high-scores-section');

    // Toggle visibility
    if (isHighScoreVisible) {
        highScoresSection.style.display = 'none'; // Hide if already visible
        isHighScoreVisible = false;
        document.getElementById('show-highscores-btn').innerText = 'Show High Scores'; // Update button text
    } else {
        fetch('http://localhost:3000/highscores')
            .then(response => response.json())
            .then(data => {
                const highScoresTable = highScoresSection.getElementsByTagName('tbody')[0];
                highScoresTable.innerHTML = ''; // Clear any existing rows

                // Create an object to keep track of the highest scores for each user
                const userScores = {};

                // Process the fetched data to get highest scores
                data.forEach(scoreEntry => {
                    if (!userScores[scoreEntry.username]) {
                        userScores[scoreEntry.username] = { category: scoreEntry.category, score: scoreEntry.score };
                    } else if (scoreEntry.score > userScores[scoreEntry.username].score) {
                        userScores[scoreEntry.username].score = scoreEntry.score; // Update score if new score is higher
                        userScores[scoreEntry.username].category = scoreEntry.category; // Update category if necessary
                    }
                });

                // Convert the userScores object to an array and sort it by score descending
                const sortedScores = Object.keys(userScores).map(username => ({
                    username,
                    category: userScores[username].category,
                    score: userScores[username].score
                })).sort((a, b) => b.score - a.score); // Sort by score in descending order

                // Display the unique users and their highest scores
                sortedScores.forEach(scoreEntry => {
                    const row = highScoresTable.insertRow();
                    row.insertCell(0).innerText = scoreEntry.username;
                    row.insertCell(1).innerText = getCategoryName(scoreEntry.category);
                    row.insertCell(2).innerText = scoreEntry.score;
                });

                highScoresSection.style.display = 'block'; // Show the section
                isHighScoreVisible = true; // Update visibility state
                document.getElementById('show-highscores-btn').innerText = 'Hide High Scores'; // Update button text
            });
    }
}




// Helper function to get category name
function getCategoryName(categoryId) {
    const categories = {
        9: 'General Knowledge',
        23: 'History',
        21: 'Sports',
        32: 'Cartoon & Animation',
        11: 'Films'
    };
    return categories[categoryId] || 'Unknown';
}

function displayCategoryScores() {
    const categoryScoresTable = document.getElementById('category-scores-table');
    const tbody = categoryScoresTable.getElementsByTagName('tbody')[0];
    const categoryScoresTitle = document.getElementById('category-scores-title'); // Get the title element

    // Check if the table is currently displayed
    if (categoryScoresTable.style.display === 'block') {
        categoryScoresTable.style.display = 'none'; // Hide the table if it's currently visible
        categoryScoresTitle.style.display = 'none'; // Hide the title
    } else {
        tbody.innerHTML = ''; // Clear previous data
        fetch('http://localhost:3000/highscores') // Adjust this if you have a different endpoint
            .then(response => response.json())
            .then(data => {
                const userScores = {};
                
                // Organize scores by username and category
                data.forEach(entry => {
                    const { username, category, score } = entry;

                    if (!userScores[username]) {
                        userScores[username] = {
                            'General Knowledge': 0,
                            'History': 0,
                            'Sports': 0,
                            'Cartoon & Animation': 0,
                            'Films': 0
                        };
                    }

                    // Update the score for the relevant category
                    userScores[username][getCategoryName(category)] = score;
                });

                // Populate the table
                Object.keys(userScores).forEach(username => {
                    const row = tbody.insertRow();
                    row.insertCell(0).innerText = username;
                    row.insertCell(1).innerText = userScores[username]['General Knowledge'];
                    row.insertCell(2).innerText = userScores[username]['History'];
                    row.insertCell(3).innerText = userScores[username]['Sports'];
                    row.insertCell(4).innerText = userScores[username]['Cartoon & Animation'];
                    row.insertCell(5).innerText = userScores[username]['Films'];
                });

                categoryScoresTable.style.display = 'block'; // Show the table
                categoryScoresTitle.style.display = 'block'; // Show the title
            });
    }
}



function saveHighScore(username, score) {
    const currentCategory = category; // Assuming you have a way to track current category
    fetch(`http://localhost:3000/highscores?username=${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const userId = data[0].id; // Get the existing user ID
                const existingScore = data[0].score;

                // Update if the score for the current category is higher
                if (score > existingScore) {
                    fetch(`http://localhost:3000/highscores/${userId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, category: currentCategory, score })
                    });
                }
            } else {
                // Create a new entry
                fetch('http://localhost:3000/highscores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, category: currentCategory, score })
                });
            }
        });
}


// Event listeners
document.getElementById('start-button').addEventListener('click', startQuiz);
document.getElementById('next-button').addEventListener('click', nextQuestion);
document.getElementById('high-score-button').addEventListener('click', displayHighScores);
document.getElementById('show-category-scores-btn').addEventListener('click', displayCategoryScores);


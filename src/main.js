// First, we import our stylesheet. This is the modern way to do it in a Vite project.
import './style.css';

// --- 1. SELECTING HTML ELEMENTS ---
// We need to get a reference to all the interactive parts of our HTML page.
// We use `document.getElementById()` to "grab" them so our JavaScript can work with them.

const reviewBtn = document.getElementById('review-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');

const inputCode = document.getElementById('input-code');
const reviewOutput = document.getElementById('review-output');
const outputCode = document.getElementById('output-code');
const scoreDisplay = document.getElementById('score-display');

const loader = document.getElementById('loader');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');


// --- 2. THE MAIN AI API FUNCTION ---
// This is the most important function. It's an `async function` because it needs
// to `await` a response from the AI, which takes time.

async function callGeminiAPI(code) {
  // NOTE: This API key is an empty string. In a real public website, you would
  // never put your key here. For this project, it's okay because we are running
  // it locally, but you will need to get your own key from Google AI Studio.
  const apiKey = ""; // <-- PASTE YOUR GOOGLE AI STUDIO API KEY HERE
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  // This is the detailed "prompt" we are sending to the AI.
  // We are giving it a persona ("expert code reviewer") and telling it exactly
  // what to check for and how to format its response (as a JSON object).
  const prompt = `
    Please act as an expert code reviewer. Analyze the following code snippet.
    Your analysis MUST check for the following specific issues:
    1.  XSS vulnerabilities (e.g., from using .innerHTML).
    2.  Global variable pollution.
    3.  Missing error handling (e.g., lack of try...catch in async functions).
    4.  Inefficient logic or performance bottlenecks.
    5.  Outdated practices (e.g., using 'var' instead of 'let'/'const').
    6.  Hardcoded "magic strings".

    Based on your analysis, provide a concise, summarized review. Use markdown bullet points (e.g., "* Point 1") to list the most important issues.

    Then, determine the purpose of the code and check if it correctly achieves that purpose.
    - If the code is already perfect and achieves its goal, your review should state that, and "updatedCode" should be an empty string.
    - If the code works but can be improved for style, performance, or best practices, provide the updated version.
    - If the code is broken or incorrect, provide the corrected version.

    Finally, give a score from 0 to 100 for the ORIGINAL code.

    Return your response ONLY as a valid JSON object with the following structure:
    {
      "review": "Your summarized review in markdown bullet points here.",
      "updatedCode": "The fully corrected and improved code here, or an empty string if no changes are needed.",
      "score": <the score as an integer>
    }

    Here is the code to review:
    \`\`\`
    ${code}
    \`\`\`
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  // We use the `fetch` API to send our request to the AI.
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // The AI's response is often wrapped in markdown, so we need to clean it up
  // and parse it as JSON.
  const textResponse = result.candidates[0].content.parts[0].text;
  const cleanedResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanedResponse);
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", cleanedResponse);
    throw new Error("The AI returned an invalid response. Please try again.");
  }
}


// --- 3. EVENT LISTENERS (Making Buttons Work) ---
// We use `addEventListener` to tell our buttons what to do when they are clicked.

// The main "Review My Code" button
reviewBtn.addEventListener('click', async () => {
  const userCode = inputCode.value.trim();
  if (!userCode) {
    showError("Please paste some code in the input box before reviewing.");
    return;
  }

  // Show a loading spinner and disable the button while we wait for the AI
  hideError();
  loader.classList.remove('hidden');
  reviewBtn.disabled = true;

  try {
    const result = await callGeminiAPI(userCode);
    
    // Update the page with the AI's feedback
    reviewOutput.innerHTML = formatReviewAsHtml(result.review);
    
    if (result.updatedCode && result.updatedCode.trim() !== "") {
      outputCode.value = result.updatedCode;
    } else {
      outputCode.value = "No changes needed. Your code is looking great!";
    }

    animateScore(result.score);

  } catch (error) {
    console.error("Error during AI review:", error);
    showError(`An error occurred: ${error.message}`);
  } finally {
    // Hide the loader and re-enable the button when done
    loader.classList.add('hidden');
    reviewBtn.disabled = false;
  }
});

// The "Clear" button
clearBtn.addEventListener('click', () => {
    inputCode.value = '';
    reviewOutput.innerHTML = "AI's feedback will appear here...";
    outputCode.value = '';
    scoreDisplay.textContent = 'N/A';
    hideError();
});

// The "Copy" button
copyBtn.addEventListener('click', () => {
    if (outputCode.value) {
        navigator.clipboard.writeText(outputCode.value).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        });
    }
});


// --- 4. HELPER FUNCTIONS (For UI Updates) ---
// These are smaller functions that help us manage the user interface.

function formatReviewAsHtml(reviewText) {
  // Converts the AI's markdown bullet points into a proper HTML list
  const lines = reviewText.split('\n').filter(line => line.trim() !== '');
  let html = '<ul class="space-y-2">';
  lines.forEach(line => {
      let trimmedLine = line.trim().substring(line.indexOf('*') + 1).trim();
      html += `<li class="ml-5 list-disc">${trimmedLine}</li>`;
  });
  html += '</ul>';
  return html;
}

function animateScore(finalScore) {
  // Animates the score counting up from 0
  let currentScore = 0;
  const timer = setInterval(() => {
    currentScore++;
    scoreDisplay.textContent = currentScore;
    if (currentScore >= finalScore) {
      clearInterval(timer);
    }
  }, 20); // 20ms interval for a smooth animation
}

function showError(message) {
  errorMessage.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

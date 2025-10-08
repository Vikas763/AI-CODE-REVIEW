// This code runs on Netlify's servers, not in the browser.
// Your API key is safe here.

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code } = JSON.parse(event.body);
    // Securely access the API key from Netlify's environment variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on the server.' }) };
    }

    // MODIFIED: Changed the model name to the correct, stable version 'gemini-pro'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const prompt = `
Act as an expert senior software developer and code reviewer.
Your task is to provide a detailed, constructive review of the following code snippet.

Analyze the code based on these criteria:
1.  **Correctness and Bugs:** Identify any logic errors, potential runtime errors, or edge cases that are not handled.
2.  **Best Practices & Readability:** Check for adherence to modern coding standards, clarity, and maintainability. Suggest improvements for variable names, comments, and structure.
3.  **Performance & Efficiency:** Highlight any inefficient code, unnecessary computations, or memory leaks. Suggest more performant alternatives.
4.  **Security:** Point out potential security vulnerabilities (e.g., injection risks, exposed secrets, improper error handling).

After the analysis, provide a response in a single, clean JSON object with no extra text or commentary outside the JSON. The JSON object must have these exact keys:
-   "language": A string identifying the programming language (e.g., "JavaScript", "Python").
-   "review": A string containing your detailed feedback in Markdown format. Use bullet points for clarity.
-   "updatedCode": A string with the refactored code, incorporating all your suggestions. If no changes are needed, return the original code.
-   "score": A number from 1 to 10, where 1 is poor and 10 is excellent, representing the overall quality of the code.

Code to review:
\`\`\`
${code}
\`\`\`
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return { statusCode: response.status, body: JSON.stringify(errorData) };
    }

    const result = await response.json();
    const responseText = result.candidates[0].content.parts[0].text;

    // Send the clean JSON response from Gemini back to the frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: responseText,
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};


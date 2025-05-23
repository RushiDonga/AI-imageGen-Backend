const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");
const OpenAI = require("openai");

const defaultPrompt = `You are an intelligent assistant designed to analyze and organize WhatsApp group chat transcripts. I will provide you with raw, unstructured WhatsApp group messages. Your task is to deeply analyze the content and return highly detailed and structured insights under the following categories:

1. **Actions** – List all tasks or responsibilities discussed. Mention who is responsible, what the task is, and any relevant deadlines or follow-up.
2. **Events** – Identify any planned, ongoing, or completed events. Include details like date, time, location (if mentioned), purpose of the event, and participants.
3. **Jokes** – Extract all humorous content, sarcastic comments, or light-hearted banter. Try to explain why something might be funny or humorous.
4. **Summaries** – Provide a comprehensive summary of the entire conversation. Describe the flow of the chat, main topics, and outcomes.
5. **Questions** – List all explicit or implicit questions asked. Identify who asked them and if they were answered or not.
6. **Reminders** – Identify any explicit or implied reminders or follow-ups. Note who is reminding whom, and what the reminder is about.
7. **Decisions** – Highlight all decisions made in the chat. Be specific about what was decided, who made the decision, and if it was agreed upon by the group.
8. **Disagreements** – Extract any conflicting opinions, debates, or disagreements. Provide context, involved parties, and resolution status (if resolved).
9. **Topic Clusters** – Identify major topics of discussion and group related messages under each topic. For each cluster, provide a short title and a description.

Please make sure, you do not need to generate the categories with random data. Sometimes, the data might include all the categories and sometimes it will not, so be precise
Please be as detailed and specific as possible. Capture names, dates, message tone, intent, and outcomes wherever applicable.

Return the result in the following JSON structure:

{
  "Actions": [ { "who": "", "what": "", "due_when": "", "context": "" } ],
  "Events": [ { "description": "", "when": "", "where": "", "who": "", "context": "" },],
  "Jokes": [ { "message": "", "why_funny": "", "who": "", "context": "" } ],
  "Summaries": "Full detailed summary of the entire chat here...",
  "Questions": [ { "question": "", "who": "", "answered_by": "", "answer": "" }],
  "Reminders": [ { "reminder": "", "who": "", "for_whom": "", "when": "", "context": "" } ],
  "Decisions": [ { "decision": "", "who": "", "agreed_by": "", "context": "" }],
  "Disagreements": [ { "topic": "", "parties": "", "summary": "", "resolved": "", "context": "" } ],
}

Here is the chat transcript:  
`;

exports.organizeData = catchAsync(async (req, res, next) => {
  const content = defaultPrompt + req.body.data;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

    const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    store: true,
    messages: [{ role: "user", content: content }],
  });

  const cleanJsonString = completion.choices[0].message.content.replace(/^```json|```$/g, "").trim();
  

  res.status(200).json({
    status: 'success',
    data: JSON.parse(completion.choices[0].message.content)
  });
});

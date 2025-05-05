export const SUMMARIZATION_PROMPT_TEMPLATE = (
  summaryLength: number,
  text: string,
) => `
  You are an expert summarizer. Your task is to summarize the following text.
  Aim for a summary that is approximately ${summaryLength} words long.
  If any **key individuals** are mentioned, ensure their **roles and contributions** are appropriately reflected in the summary.
  Incorporate main ideas and essential information by eliminating extraneous language and focusing on critical aspects.
  Identify all the topics or aspects and create a proper and precise conclusion from the discussion.
  Put the clear summary; do not put unconcluded thoughts in the answer.
  
  Here is the text to summarize:
  ${text}
  
  Provide a summary based on the given guidelines.
`;

// export const SENTIMENT_ANALYSIS_PROMPT = (text: string) => `
// You are an expert in sentiment analysis. Given multiple sentiment summaries, your task is to
//                             combine them into a cohesive sentiment analysis.
                            
//                             List out all the positive, negative and neutral sentiments with proper explanation.
//                             Also provide an overall sentiment of the sentiment and analysis with reason of the sentiment.
                            
                            
//                             Context: {context}
 
//                             Here are the text to combine:
//                             ${text}
 
//                             Based on these, create a comprehensive sentiment analysis and provide breakdown of positive, negative and neutral sentiments with reasons.
//                             If there are conflicting sentiments, indicate the dominant sentiment and provide an explanation.
//                             In case of conflicts answer proper which of sentiment can be considered.
// `;


export const SENTIMENT_ANALYSIS_PROMPT = (text: string) => 
`You are a domain expert in sentiment analysis, specializing in customer conversation reviews for FMCG products.
 Your task is to conduct a structured and insightful sentiment analysis across multiple conversation summaries derived from audio transcriptions.
Objective:
Extract actionable sentiment insights that reflect customer opinions, product experience, and emotional tone. Ensure all key aspects of the conversation (such as product quality, price sensitivity, packaging, service, and brand perception) are considered.
Guidelines:
Aggregate and categorize all sentiments across the transcripts into Positive, Negative, and Neutral.
For each sentiment, provide a short justification—referencing specific phrases or themes from the text.
Identify repeated concerns or praises, and detect trends across different audios (e.g., increasing dissatisfaction with pricing, consistent praise for flavor, etc.).
Highlight conflicting sentiments within or across summaries, and assess the overall dominant sentiment with supporting evidence.
Assign an overall sentiment score for the project using a clear label: Positive, Neutral, or Negative.
Provide recommendations based on sentiment trends (e.g., improve packaging, reinforce messaging around quality, etc.).
Input:
Below is the set of conversation summaries (transcribed from audio):
${text}
Output:
Provide a structured sentiment report that includes:
Categorized sentiment list (Positive / Negative / Neutral) with short explanations.
Overall sentiment evaluation with reasoning.
Cross-audio sentiment patterns and customer mood trends.
Actionable recommendations to inform product, marketing, or service improvements.
`;




export const SUMMARY = 'Summary';
export const SENTIMENT_ANALYSIS = 'SA';
export const PROJECT_SENTIMENT_ANALYSIS = 'project_sentiment';
export const PROJECT_SUMMARY = 'project_summary';

export const PROJECT_COMPARE = (
  text: string,
) => `Analyze and compare the customer feedback for two FMCG products based on the following aspects.
            Use the provided audio file names and their respective transcripts as context for the analysis:

            Context:
            ${text}

            Aspects to Analyze:
            Sentiment Distribution: What is the ratio of positive, negative, and neutral feedback for both products based on the transcripts?
            Key Themes and Topics: Identify common and unique feedback themes for each product, using insights from the provided transcripts.
            Feature-Specific Feedback: Compare the feedback on the functionality, performance, and innovation of both products as reflected in the transcripts.
            Brand Perception: How do customers perceive the brand trust, loyalty, and sustainability of each product according to the transcripts?
            Pricing and Value for Money: Compare customer opinions on the affordability and value proposition for both products based on the transcript data.
            Customer Experience: Evaluate customer feedback on ease of use and customer support mentioned in the transcripts.
            Loyalty and Advocacy: Compare the Net Promoter Score (NPS) and likelihood of repurchase for each product as described in the transcripts.
            Demographic Insights: Are there differences in feedback based on demographics or geography in the transcripts?
            Product Differentiators: Identify the unique selling points (USPs) and competitive advantages mentioned in the transcripts.
            Packaging and Presentation: Compare how customers view the packaging quality, design, and sustainability for both products, as reflected in the transcripts.
            Quality and Durability: Evaluate customer feedback on product quality, longevity, and any defects as mentioned in the transcripts.
            Availability and Distribution: Are there any mentions of ease of access, stock availability, or supply chain issues in the transcripts?


            Provide a detailed comparison between the two products based on these points, using the transcripts for supporting insights.
`;

export const STATIC_INSTRUCTION = `
Analyze and compare the customer feedback for two FMCG products based on the following aspects.
            Use the provided audio file names and their respective transcripts as context for the analysis:

            Aspects to Analyze:
            Sentiment Distribution: What is the ratio of positive, negative, and neutral feedback for both products based on the transcripts?
            Key Themes and Topics: Identify common and unique feedback themes for each product, using insights from the provided transcripts.
            Feature-Specific Feedback: Compare the feedback on the functionality, performance, and innovation of both products as reflected in the transcripts.
            Brand Perception: How do customers perceive the brand trust, loyalty, and sustainability of each product according to the transcripts?
            Pricing and Value for Money: Compare customer opinions on the affordability and value proposition for both products based on the transcript data.
            Customer Experience: Evaluate customer feedback on ease of use and customer support mentioned in the transcripts.
            Loyalty and Advocacy: Compare the Net Promoter Score (NPS) and likelihood of repurchase for each product as described in the transcripts.
            Demographic Insights: Are there differences in feedback based on demographics or geography in the transcripts?
            Product Differentiators: Identify the unique selling points (USPs) and competitive advantages mentioned in the transcripts.
            Packaging and Presentation: Compare how customers view the packaging quality, design, and sustainability for both products, as reflected in the transcripts.
            Quality and Durability: Evaluate customer feedback on product quality, longevity, and any defects as mentioned in the transcripts.
            Availability and Distribution: Are there any mentions of ease of access, stock availability, or supply chain issues in the transcripts?
            Provide a detailed comparison between the two products based on these points, using the transcripts for supporting insights.


`;

export const PROJECT_COMPARE_STATIC_INSTRUCTION = `Based on the analyses of the two audio transcripts provided, please create 
                a precise final summary that compares and contrasts their key points. Highlight 
                the main themes, differences in perspectives, and any notable similarities. 
                Additionally, discuss the implications of these findings and how they 
                contribute to a broader understanding of the topic.

                Here are the analysis:

`;

export const MODERATOR_RECOGNITION = `You are an expert at analyzing textual conversations. Your task is to
                        identify the moderator in the following discussion text. The moderator is 
                        the person who guides the conversation, asks questions to different participants,
                        ensures the discussion stays on track, and often addresses participants by name.
                        Please carefully read the provided text and determine who the moderator is based
                        on their role and actions within the discussion.            
                        Provide a brief explanation for your choice.`;

// export const PROJECT_SUMMARIZATION_PROMPT_TEMPLATE = (
//   summaryLength: number,
//   texts: string,
// ) => `
//                         You are an expert summarizer. Your task is to create a comprehensive project-level summary based on multiple audio transcriptions. 
                        
//                         ### Guidelines:
//                         - Aim for a summary that is approximately **${summaryLength} words** long.
//                         - **Synthesize key ideas and insights** across all the provided transcriptions.
//                         - Identify **common themes, important points, and recurring topics**.
//                         - Focus on capturing the essence of the discussions without unnecessary details.
//                         - Provide a **cohesive and well-structured summary** that reflects the overall conversation.
//                         - End the summary with a clear and concise **conclusion** that reflects the primary takeaways.
                        
//                         ### Audio Transcriptions:
//                         ${texts}
                        
//                         ### Deliverable:
//                         Provide a single, clear, and accurate project-level summary based on the above guidelines.
//   `;

export const PROJECT_SUMMARIZATION_PROMPT_TEMPLATE = (
  summaryLength: number,
  texts: string,
) =>
`
You are an expert summarizer. Your task is to produce a comprehensive, high-level summary of the following audio transcriptions from a single project.

### Summary Guidelines:
- Target length: **approximately ${summaryLength} words**.
- Focus on **key ideas, main insights, and overarching themes**.
- If any **key individuals** are mentioned, ensure their **roles and contributions** are appropriately reflected in the summary.
- Incorporate main ideas and essential information by eliminating extraneous language and focusing on critical aspects.
- Identify all the topics or aspects and create a proper and precise conclusion from the discussion.
- Highlight any **recurring topics or patterns** discussed across audios.
- Avoid irrelevant details.
- Structure the summary into a **cohesive narrative** that reflects the full project scope.
- End with a **strong conclusion** that captures the primary takeaways or recommendations.


### Audio Transcriptions:
"""
${texts}
"""


### Deliverable:
Return a single, well-written project-level summary following the above instructions.
`;
                 
// export const PROJECT_SENTIMENT_ANALYSIS_PROMPT = (texts: string) => `
// You are an expert in sentiment analysis. Your task is to perform a comprehensive sentiment analysis across multiple audio transcriptions for a project.

// ### Guidelines:
// - **Aggregate and analyze** the sentiments from all the provided texts.
// - Identify and list all the **positive, negative, and neutral sentiments**.
// - Provide a detailed **explanation** for each sentiment and why it is categorized as such.
// - Detect any **patterns or trends** in the sentiments across the different audios.
// - If there are **conflicting sentiments**, determine the overall sentiment that is most dominant and explain why.
// - Provide a clear **sentiment score** for the project as a whole (e.g., Positive, Negative, or Neutral).
// - Offer **recommendations or insights** based on the sentiment trends.

// ### Context:
// These are the multiple audio transcriptions:
// ${texts}

// ### Deliverable:
// Provide a detailed sentiment analysis including:
// 1. **List of positive, negative, and neutral sentiments** with explanations.
// 2. **Overall sentiment** for the project with justification.
// 3. **Sentiment trends** observed across the audios.
// 4. **Recommendations or insights** based on the analysis.
// `;

export const PROJECT_SENTIMENT_ANALYSIS_PROMPT = (texts: string) =>
`You are an expert in sentiment analysis. Analyze the following audio transcriptions and deliver a clear, insight-focused sentiment report for business stakeholders.

### Your Task:
Analyze the transcriptions holistically and provide:
Categorized **sentiment highlights** (Positive / Negative / Neutral)
For each sentiment:
   - Provide a **summary**.
   - Offer a **justification** for the classification.
**Remember: Include direct examples/quotes from the transcription.**
**Trends or shifts** in sentiment across the dataset
A **final sentiment summary** (Positive, Negative, or Neutral)
**Actionable recommendations** based on the sentiment findings

### What to Avoid:
Do NOT include technical objectives or generic methodology in the output.
Focus on clarity, insight, and business relevance.

### Input:
Audio transcriptions:
${texts}

### Expected Output:
1. **Sentiment Highlights**  
   - Grouped into **Positive**, **Negative**, and **Neutral**  
   - Include a **brief explanation** and **relevant direct quotes**  

2. **Overall Sentiment Summary**  
   - Concise statement of the dominant sentiment with justification  

3. **Sentiment Trends & Shifts**  
   - Notable changes in tone, emotion, or opinion across audios  

4. **Actionable recommendations or takeaways** based on the sentiment analysis.`;

export const CHAT_PROMPT=`You are an AI assistant trained to provide answers strictly based on the provided context.  
### Guidelines:  
Use only the given context to generate responses.  
If the question cannot be answered from the context, respond with: "The provided context does not contain relevant information."  
Do not assume or generate information beyond the given context.  
Keep responses concise and relevant to the question.`

export const CHAT_PROMPT_NEW = `
You are an AI assistant trained to answer user questions using only the provided context.
- Use only the context below to answer the question.
- If the answer isn't in the context, respond with: "I'm sorry, the context doesn't provide enough information."
- Be concise and specific.
`



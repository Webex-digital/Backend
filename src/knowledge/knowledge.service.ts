import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStore } from './vector.store';

@Injectable()
export class KnowledgeService {
  private embeddings = new OpenAIEmbeddings();
  private model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });

  // Professional FAQ Dictionary for instant, high-quality answers
  private professionalFAQ: Record<string, string> = {
    'pricing': 'Our pricing is tailored to the scope and complexity of your project. We offer custom packages ranging from landing pages to full-scale enterprise platforms. To give you an accurate quote, we recommend starting a project request.',
    'services': 'Webex Digital specializes in high-end UI/UX Design, professional Web Development, and Brand Identity. We focus on creating digital experiences that are both aesthetically bold and functionally seamless.',
    'process': 'Our methodology follows four key stages: 1. Discovery (understanding your vision), 2. Design (crafting the blueprint), 3. Develop (bringing it to life with clean code), and 4. Launch (rigorous testing and deployment).',
    'timeline': 'Timelines vary by project. A high-conversion landing page typically takes 1-2 weeks, while a complex custom platform can take 4-12 weeks. We provide a detailed timeline during the discovery phase.',
    'contact': 'You can reach us directly through the "Start a Project" form on our website, or via email at producelabsandco@gmail.com.',
    'about': 'WEBEX is a premium digital agency dedicated to the art of minimal, high-impact design. We build digital architects who prioritize precision in every pixel and purpose in every line.',
  };

  constructor(private readonly vectorStore: VectorStore) {}

  private findFaqMatch(question: string): string | null {
    const q = question.toLowerCase();
    if (/^(hi|hello|hey|hii|good morning|good afternoon|good evening|greetings)[!.,\s]*$/.test(q)) {
      return 'Hello! Welcome to WEBEX Digital. I can answer questions about our services, pricing, process, and timelines—or connect you with our team for a project conversation.';
    }
    if (q.includes('price') || q.includes('cost') || q.includes('how much')) return this.professionalFAQ['pricing'];
    if (q.includes('service') || q.includes('do you do') || q.includes('offer')) return this.professionalFAQ['services'];
    if (q.includes('process') || q.includes('how it works') || q.includes('method')) return this.professionalFAQ['process'];
    if (q.includes('time') || q.includes('how long') || q.includes('duration')) return this.professionalFAQ['timeline'];
    if (q.includes('contact') || q.includes('email') || q.includes('reach')) return this.professionalFAQ['contact'];
    if (q.includes('who are you') || q.includes('about webex') || q.includes('agency')) return this.professionalFAQ['about'];
    return null;
  }

  answerFaq(question: string): string | null {
    return this.findFaqMatch(question);
  }

  async askQuestion(question: string): Promise<{ answer: string; requiresHuman: boolean }> {
    // 1. Try Hard-coded Professional FAQ first (Instant & Free)
    const faqAnswer = this.findFaqMatch(question);
    if (faqAnswer) {
      return { answer: faqAnswer, requiresHuman: false };
    }

    try {
      // 2. Try AI RAG
      const queryEmbedding = await this.embeddings.embedQuery(question);
      const contextDocs = await this.vectorStore.searchSimilar(queryEmbedding);
      const contextText = contextDocs
        .filter(doc => doc.score > 0.7)
        .map(doc => doc.content)
        .join('\\n\\n');

      if (!contextText) {
        // No AI context found -> Trigger Human Handoff
        return {
          answer: 'That is a great question. I am notifying our human experts right now, and one of them will jump into this chat shortly to give you a precise answer!',
          requiresHuman: true
        };
      }

      const prompt = `
        You are a helpful assistant for Webex Digital.
        Use the following pieces of retrieved context to answer the user's question.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        Context:
        ${contextText}

        Question: ${question}
        Answer:
      `;

      const response = await this.model.invoke(prompt);
      return { answer: response.content as string, requiresHuman: false };

    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('credits')) {
        console.warn('OpenAI Quota Exhausted: Triggering Human Handoff.');
        return {
          answer: `I'm currently experiencing a high volume of requests, but your question about "${question}" is important. I've alerted our team, and a human expert will respond to you here very soon!`,
          requiresHuman: true
        };
      }
      throw error;
    }
  }

  async ingestKnowledge(title: string, content: string): Promise<void> {
    const embedding = await this.embeddings.embedDocuments([content]);
    await this.vectorStore.saveEmbedding(title, content, embedding[0]);
  }
}

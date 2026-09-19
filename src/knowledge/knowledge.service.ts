import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStore } from './vector.store';

@Injectable()
export class KnowledgeService {
  private embeddings = new OpenAIEmbeddings();
  private model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });

  constructor(private readonly vectorStore: VectorStore) {}

  async askQuestion(question: string): Promise<string> {
    // 1. Embed the user query
    const queryEmbedding = await this.embeddings.embedQuery(question);

    // 2. Search for similar documents
    const contextDocs = await this.vectorStore.searchSimilar(queryEmbedding);
    const contextText = contextDocs
      .filter(doc => doc.score > 0.7) // Relevance threshold
      .map(doc => doc.content)
      .join('\n\n');

    if (!contextText) {
      return 'I am sorry, but I could not find any information in my knowledge base to answer that question.';
    }

    // 3. Feed context to LLM
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
    return response.content as string;
  }

  async ingestKnowledge(title: string, content: string): Promise<void> {
    const embedding = await this.embeddings.embedDocuments([content]);
    await this.vectorStore.saveEmbedding(title, content, embedding[0]);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as socketio from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('ChatGateway (e2e)', () => {
  let app: INestApplication;

  const conversationId = 'test-conv-123';
  const user1Id = 'user-1';
  const user2Id = 'user-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3001);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow users to join a conversation and exchange messages', (done) => {
    const client1 = new socketio.io('http://localhost:3001');
    const client2 = new socketio.io('http://localhost:3001');

    let messagesReceived = 0;
    const expectedMessage = {
      conversationId,
      senderId: user1Id,
      content: 'Hello from User 1',
      type: 'TEXT',
    };

    client1.on('connect', () => {
      client1.emit('join_conversation', { conversationId }, (res: any) => {
        client2.on('connect', () => {
          client2.emit('join_conversation', { conversationId }, () => {

            client2.on('new_message', (msg: any) => {
              expect(msg.content).toBe(expectedMessage.content);
              expect(msg.type).toBe(expectedMessage.type);
              messagesReceived++;
              if (messagesReceived === 1) {
                client1.disconnect();
                client2.disconnect();
                done();
              }
            });

            client1.emit('send_message', expectedMessage, (response: any) => {
              expect(response.status).toBe('sent');
            });
          });
        });
      });
    });
  });

  it('should handle different message types (ORDER_CARD)', (done) => {
    const client1 = new socketio.io('http://localhost:3001');
    const client2 = new socketio.io('http://localhost:3001');

    const orderCardMessage = {
      conversationId,
      senderId: user1Id,
      content: 'Order #12345',
      type: 'ORDER_CARD',
    };

    client1.on('connect', () => {
      client1.emit('join_conversation', { conversationId }, () => {
        client2.on('connect', () => {
          client2.emit('join_conversation', { conversationId }, () => {

            client2.on('new_message', (msg: any) => {
              expect(msg.content).toBe(orderCardMessage.content);
              expect(msg.type).toBe('ORDER_CARD');
              client1.disconnect();
              client2.disconnect();
              done();
            });

            client1.emit('send_message', orderCardMessage, (response: any) => {
              expect(response.status).toBe('sent');
            });
          });
        });
      });
    });
  });
});

import { expect, test, describe } from 'vitest';
import { MessageReader } from '../src/backend/protocol/MessageReader';
import { type Message, FileMessage } from '../src/backend/protocol/Message';
import { Action } from '../src/backend/common-types';
import fs from 'node:fs';

const createMessage = (action: Action, data: Buffer) => {
  const actionByte = Buffer.from([action]); // 1-byte action

  // 2. Combine action + JSON
  const content = Buffer.concat([actionByte, data]);

  // 3. Prefix with int64le length (8 bytes)
  const lengthBuffer = Buffer.alloc(8);
  lengthBuffer.writeBigInt64LE(BigInt(content.length), 0);

  // 4. Final handshake message
  return Buffer.concat([lengthBuffer, content]);
};

const testFilePath = '8923472904.txt';
const handshakeMessageText = '{"hostname":"example"}';
const handshakeMessage = createMessage(Action.HANDSHAKE, Buffer.from('{"hostname":"example"}', 'utf-8'));
const fileMessage = createMessage(Action.FILE, Buffer.from('{"hostname":"example"}', 'utf-8'));

describe('Simply read handshake message', async () => {
  const reader = new MessageReader();
  const bytesLeft = await reader._read(handshakeMessage, message => {
    test('action matches', () => expect(message.action).toEqual(Action.HANDSHAKE));
    test('content matches', () => expect(message.data?.toString('utf-8')).toEqual(handshakeMessageText));
  });
  test('all read', () => expect(bytesLeft).toBe(0));
});
describe('Read handshake message', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  await reader.read(handshakeMessage, msg => result.push(msg));
  test('received 1 message', () => expect(result.length).toBe(1));
  test('action matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});
describe('Read 2 messages at once', async () => {
  const reader = new MessageReader();
  const messages = [handshakeMessage, handshakeMessage];
  const messagesBuf = Buffer.concat(messages);
  let iMessage = 0;
  await reader.read(messagesBuf, message => {
    iMessage++;
    test(`action ${iMessage} matches`, () => expect(message.action).toBe(Action.HANDSHAKE));
    test(`content ${iMessage} matches`, () => expect(message.data?.toString('utf-8')).toEqual(handshakeMessageText));
  });
  test('all messages received', () => expect(iMessage).toBe(messages.length));
});

const handshakeMessage_2 = [handshakeMessage.subarray(0, handshakeMessage.length / 2), handshakeMessage.subarray(handshakeMessage.length / 2)];
describe('Read handshake message, but split in half', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  for (const part of handshakeMessage_2)
    await reader.read(part, msg => result.push(msg));
  test('received 1 message', () => expect(result.length).toBe(1));
  test('action matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});

// assume header length is 9
const handshakeMessage_Header_Body = [handshakeMessage.subarray(0, 9), handshakeMessage.subarray(9)];
describe('Read handshake message, but split in header and body', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  for (const part of handshakeMessage_Header_Body)
    await reader.read(part, msg => result.push(msg));
  test('received 1 message', () => expect(result.length).toBe(1));
  test('action matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});

const handshakeMessage_HeaderStart_Body = [handshakeMessage.subarray(0, 3), handshakeMessage.subarray(3)];
describe('Read handshake message, but split in header start and body', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  for (const part of handshakeMessage_HeaderStart_Body)
    await reader.read(part, msg => result.push(msg));
  test('received 1 message', () => expect(result.length).toBe(1));
  test('action matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});

const handshakeMessage_Length_Body = [handshakeMessage.subarray(0, 1), handshakeMessage.subarray(1)];
describe('Read handshake message, but split in length and everything else', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  for (const part of handshakeMessage_Length_Body)
    await reader.read(part, msg => result.push(msg));
  test('received 1 message', () => expect(result.length).toBe(1));
  test('action matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});
const handshakeMessage_HeaderStart_Body_2 = [handshakeMessage.subarray(0, 3), Buffer.concat([handshakeMessage.subarray(3), handshakeMessage.subarray(0, 3)]), handshakeMessage.subarray(3)];
describe('Read 2 handshake messages, start, end + start, end', async () => {
  const reader = new MessageReader();
  const result: Message[] = [];
  for (const part of handshakeMessage_HeaderStart_Body_2)
    await reader.read(part, msg => result.push(msg));
  test('received 2 messages', () => expect(result.length).toBe(2));
  test('action 1 matches', () => expect(result[0]?.action).toBe(Action.HANDSHAKE));
  test('content 1 matches', () => expect(result[0]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
  test('action 2 matches', () => expect(result[1]?.action).toBe(Action.HANDSHAKE));
  test('content 2 matches', () => expect(result[1]?.data?.toString('utf-8')).toEqual(handshakeMessageText));
});

describe('Read file message', async () => {
  const reader = new MessageReader();
  const result: FileMessage[] = [];
  reader.expectFile(testFilePath);
  await reader.read(fileMessage, msg => result.push(msg as FileMessage));
  test('received 1 message', () => expect(result.length).toBe(1));
  const exists = fs.statSync(testFilePath).isFile();
  test('message is a file message', () => expect(result[0]).toBeInstanceOf(FileMessage));
  test('message.path matches', () => expect(result[0]?.path).toBe(testFilePath));
  test('file exists', () => expect(exists).toBe(true));
  test('data matches', () => expect(exists && fs.readFileSync(testFilePath).toString('utf-8')).toBe(handshakeMessageText));
});

describe('Read file message and data', async () => {
  const reader = new MessageReader();
  const result: (FileMessage | Message)[] = [];
  reader.expectFile(testFilePath);
  await reader.read(Buffer.concat([fileMessage, handshakeMessage]), msg => result.push(msg as FileMessage));
  test('received 2 messages', () => expect(result.length).toBe(2));
  const exists = fs.statSync(testFilePath).isFile();
  test('message is a file message', () => expect(result[0]).toBeInstanceOf(FileMessage));
  test('message.path matches', () => expect((result[0] as FileMessage)?.path).toBe(testFilePath));
  test('file exists', () => expect(exists).toBe(true));
  test('data matches', () => expect(exists && fs.readFileSync(testFilePath).toString('utf-8')).toBe(handshakeMessageText));
  test('action matches', () => expect(result[1].action).toEqual(Action.HANDSHAKE));
  test('content matches', () => expect(result[1].data?.toString('utf-8')).toEqual(handshakeMessageText));
});
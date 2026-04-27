import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMsgObjFromGatewayLine } from '../services/chat/messageModel.js';

test('messageModel normalizes OpenClaw MediaPath image metadata into image parts', () => {
    const msg = buildMsgObjFromGatewayLine({
        type: 'message',
        id: 'm1',
        timestamp: '2026-04-27T12:00:00.000Z',
        message: {
            role: 'user',
            content: 'see this',
            MediaPath: '/home/claw-agentbox/.openclaw/media/inbound/photo---abc.png',
            MediaType: 'image/png'
        }
    });

    assert.equal(msg.text, 'see this');
    assert.deepEqual(msg.parts, [
        { type: 'text', text: 'see this' },
        {
            type: 'image',
            mediaId: 'photo---abc.png',
            mimeType: 'image/png',
            url: '/api/chat/media/inbound/photo---abc.png'
        }
    ]);
    assert.equal(msg.cmAttachKind, 'image');
});

test('messageModel does not render non-image MediaPath values as image parts', () => {
    const msg = buildMsgObjFromGatewayLine({
        type: 'message',
        id: 'm2',
        message: {
            role: 'user',
            content: 'audio later',
            MediaPath: '/home/claw-agentbox/.openclaw/media/inbound/clip.mp3',
            MediaType: 'audio/mpeg'
        }
    });

    assert.equal(msg.cmAttachKind, undefined);
    assert.deepEqual(msg.parts, [{ type: 'text', text: 'audio later' }]);
});

test('messageModel infers image mime from MediaPath extension when type is absent', () => {
    const msg = buildMsgObjFromGatewayLine({
        type: 'message',
        id: 'm3',
        message: {
            role: 'user',
            content: '',
            MediaPaths: ['/home/claw-agentbox/.openclaw/media/inbound/paste.webp']
        }
    });

    assert.equal(msg.text, '');
    assert.deepEqual(msg.parts, [
        {
            type: 'image',
            mediaId: 'paste.webp',
            mimeType: 'image/webp',
            url: '/api/chat/media/inbound/paste.webp'
        }
    ]);
});

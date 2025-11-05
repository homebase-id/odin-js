import { describe, it, expect } from 'vitest';
import { getPostContentForUpload } from './PostUploadHelpers';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/constants';
import { POST_FULL_TEXT_PAYLOAD_KEY } from './PostUploader';
import type { NewHomebaseFile } from '../../../core/core';
import type { Article, PostContent } from '../PostTypes';

const makeLong = (ch: string, len: number) => new Array(len + 1).join(ch);

describe('getPostContentForUpload', () => {
    it('embeds full content in header when small', () => {
        const content: PostContent = {
            id: 'id1',
            channelId: 'chan',
            caption: 'hello',
            slug: 'slug',
            type: 'Tweet',
        };

        const file: NewHomebaseFile<PostContent> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<PostContent>;

        const { headerContent, defaultPayload, additionalPayloads } = getPostContentForUpload(file);
        expect(defaultPayload).toBeNull();
        expect(additionalPayloads.length).toBe(0);
        const parsed = JSON.parse(headerContent);
        expect(parsed).toEqual(content);
    });

    it('splits non-Article: trims caption to ~400 bytes and emits full-text payload', async () => {
        const longCaption = makeLong('x', 10000);
        const content: PostContent = {
            id: 'id2',
            channelId: 'chan',
            caption: longCaption,
            slug: 'slug2',
            type: 'Tweet',
            primaryMediaFile: { fileKey: 'k', fileId: undefined, type: 'image/png' },
            embeddedPost: {
                id: 'eid',
                channelId: 'ech',
                caption: 'embedded',
                slug: 'eslug',
                type: 'Tweet',
                permalink: 'p',
                fileId: 'f',
                globalTransitId: undefined,
                lastModified: undefined,
                userDate: 0,
                payloads: [],
                authorOdinId: 'a',
            },
        } as unknown as PostContent;

        const file: NewHomebaseFile<PostContent> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<PostContent>;

        const { headerContent, defaultPayload, additionalPayloads } = getPostContentForUpload(file);
        const parsed = JSON.parse(headerContent);

        // Caption should be trimmed with ellipsis
        expect(typeof parsed.caption).toBe('string');
        expect((parsed.caption as string).endsWith('...')).toBe(true);
        expect((parsed.caption as string).length).toBeLessThanOrEqual(403);

        // Text payload should contain full caption
        expect(additionalPayloads.length).toBe(1);
        expect(additionalPayloads[0].key).toBe(POST_FULL_TEXT_PAYLOAD_KEY);
        const textJson = await (additionalPayloads[0].payload as Blob).text();
        const textParsed = JSON.parse(textJson);
        expect(textParsed.caption).toBe(longCaption);

        // Default payload may or may not exist depending on header fit; if present, key must be default
        if (defaultPayload) {
            expect(defaultPayload.key).toBe(DEFAULT_PAYLOAD_KEY);
        }
    });

    it('Article: trims abstract to ~400 bytes, includes small body in header, full text in payload', async () => {
        const longAbstract = makeLong('a', 15000);
        const content: Article = {
            id: 'id3',
            channelId: 'chan',
            caption: 'title',
            slug: 'slug3',
            type: 'Article',
            abstract: longAbstract,
            body: 'short',
        } as unknown as Article;

        const file: NewHomebaseFile<Article> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<Article>;

        const { headerContent, additionalPayloads } = getPostContentForUpload(file);
        const parsed = JSON.parse(headerContent);

        expect(typeof parsed.abstract).toBe('string');
        expect((parsed.abstract as string).endsWith('...')).toBe(true);
        expect((parsed.abstract as string).length).toBeLessThanOrEqual(403);
        expect(parsed.body).toBe('short');

        const textJson = await (additionalPayloads[0].payload as Blob).text();
        const textParsed = JSON.parse(textJson);
        expect(textParsed.abstract).toBe(longAbstract);
        expect(textParsed.body).toBe('short');
    });

    it('throws when header remains too large after trimming (moving disabled)', async () => {
        const huge = makeLong('z', 20000);
        const content: PostContent = {
            id: 'id4',
            channelId: 'chan',
            caption: 'small',
            slug: 'slug4',
            type: 'Tweet',
            sourceUrl: huge, // forces header to remain too large even after trimming other fields
        };

        const file: NewHomebaseFile<PostContent> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<PostContent>;

        expect(() => getPostContentForUpload(file)).toThrow();
    });

    it('does not move media/embed when trimming makes header fit (split path)', async () => {
        const longCaption = makeLong('y', 12000);
        const content: PostContent = {
            id: 'id5',
            channelId: 'chan',
            caption: longCaption, // forces split path
            slug: 'slug5',
            type: 'Tweet',
            primaryMediaFile: { fileKey: 'k', fileId: undefined, type: 'image/png' },
            embeddedPost: {
                id: 'eid2',
                channelId: 'ech2',
                caption: 'embed small',
                slug: 'eslug2',
                type: 'Tweet',
                permalink: 'p2',
                fileId: 'f2',
                globalTransitId: undefined,
                lastModified: undefined,
                userDate: 0,
                payloads: [],
                authorOdinId: 'a2',
            },
        } as unknown as PostContent;

        const file: NewHomebaseFile<PostContent> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<PostContent>;

        const { headerContent, defaultPayload, additionalPayloads } = getPostContentForUpload(file);
        const parsed = JSON.parse(headerContent);

        // Trimming should make header fit without moving heavy fields
        expect(defaultPayload).toBeNull();
        expect(parsed.primaryMediaFile).toBeTruthy();
        expect(parsed.embeddedPost).toBeTruthy();
        // text payload should still be present in split path
        expect(additionalPayloads.length).toBe(1);
        expect(additionalPayloads[0].key).toBe(POST_FULL_TEXT_PAYLOAD_KEY);
    });

    it('throws when embeddedPost makes header too large (moving disabled)', async () => {
        const hugeEmbedCaption = makeLong('e', 15000);
        const content: PostContent = {
            id: 'id6',
            channelId: 'chan',
            caption: 'small',
            slug: 'slug6',
            type: 'Tweet',
            primaryMediaFile: { fileKey: 'k', fileId: undefined, type: 'image/png' },
            embeddedPost: {
                id: 'eid3',
                channelId: 'ech3',
                caption: hugeEmbedCaption, // make header huge via embeddedPost
                slug: 'eslug3',
                type: 'Tweet',
                permalink: 'p3',
                fileId: 'f3',
                globalTransitId: undefined,
                lastModified: undefined,
                userDate: 0,
                payloads: [],
                authorOdinId: 'a3',
            },
        } as unknown as PostContent;

        const file: NewHomebaseFile<PostContent> = {
            fileMetadata: {
                appData: { content },
            },
        } as unknown as NewHomebaseFile<PostContent>;

        expect(() => getPostContentForUpload(file)).toThrow();
    });
});

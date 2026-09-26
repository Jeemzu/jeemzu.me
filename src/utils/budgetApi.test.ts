import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBudget, saveBudget } from './budgetApi';
import { emptyBudget } from '../pages/budgetize/types';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: response.status ? response.status < 400 : true,
        status: response.status ?? 200,
        json: response.json ?? (() => Promise.resolve({})),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadBudget', () => {
    it('returns the saved budget and its revision', async () => {
        mockFetch({
            status: 200,
            json: () => Promise.resolve({ data: emptyBudget(), revision: 'rev-1' }),
        });

        const result = await loadBudget();

        expect(result).toEqual({ status: 'ok', data: emptyBudget(), revision: 'rev-1' });
    });

    it('reports an empty budget when nothing has been saved yet', async () => {
        mockFetch({ status: 404 });

        expect(await loadBudget()).toEqual({ status: 'empty' });
    });

    it('reports unauthorized for expired sessions and non-admins', async () => {
        mockFetch({ status: 401 });
        expect(await loadBudget()).toEqual({ status: 'unauthorized' });

        mockFetch({ status: 403 });
        expect(await loadBudget()).toEqual({ status: 'unauthorized' });
    });

    it('reports an error for server failures and missing revisions', async () => {
        mockFetch({ status: 500 });
        expect(await loadBudget()).toEqual({ status: 'error' });

        mockFetch({ status: 200, json: () => Promise.resolve({ data: emptyBudget() }) });
        expect(await loadBudget()).toEqual({ status: 'error' });
    });

    it('reports an error when the request fails outright', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        expect(await loadBudget()).toEqual({ status: 'error' });
    });
});

describe('saveBudget', () => {
    it('sends the current revision and returns the new one', async () => {
        const fetchMock = mockFetch({
            status: 200,
            json: () => Promise.resolve({ revision: 'rev-2' }),
        });

        const result = await saveBudget(emptyBudget(), 'rev-1');

        expect(result).toEqual({ status: 'ok', revision: 'rev-2' });
        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe('PUT');
        expect(JSON.parse(init.body)).toEqual({ data: emptyBudget(), revision: 'rev-1' });
    });

    it('sends a null revision when creating the first budget', async () => {
        const fetchMock = mockFetch({ status: 200, json: () => Promise.resolve({ revision: 'rev-1' }) });

        await saveBudget(emptyBudget(), null);

        expect(JSON.parse(fetchMock.mock.calls[0][1].body).revision).toBeNull();
    });

    it('reports a conflict when another device saved first', async () => {
        mockFetch({ status: 409 });

        expect(await saveBudget(emptyBudget(), 'stale')).toEqual({ status: 'conflict' });
    });

    it('reports unauthorized and error without claiming the save succeeded', async () => {
        mockFetch({ status: 401 });
        expect(await saveBudget(emptyBudget(), 'rev-1')).toEqual({ status: 'unauthorized' });

        mockFetch({ status: 500 });
        expect(await saveBudget(emptyBudget(), 'rev-1')).toEqual({ status: 'error' });

        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        expect(await saveBudget(emptyBudget(), 'rev-1')).toEqual({ status: 'error' });
    });
});

import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LevelDocument } from '../../lib/LevelDocument';
import { type BridgeAction, type BridgeRequest } from '../../lib/EditorAgentProtocol';
import { createEditorDispatcher } from './editorAgent';
import { loadCustomLevels } from '../../utils/customLevels';
import type { ProductionIdentity } from '../../lib/EditorAgentProtocol';

function request(action: BridgeAction, requestId = randomUUID()): BridgeRequest {
    return { type: 'request', requestId, expiresAt: Date.now() + 30000, action };
}

function editor() {
    const document = new LevelDocument();
    const context = {
        document, isAdmin: () => false, isPainting: () => false,
        getScrollCol: () => 0, setScrollCol: vi.fn(), render: () => 'png',
        confirm: vi.fn(() => true),
        signInProduction: vi.fn(async (): Promise<ProductionIdentity | null> =>
            ({ username: 'james', role: 'Admin', expiresAt: Date.now() + 60000 })),
    };
    return { document, context, dispatch: createEditorDispatcher(context) };
}

describe('browser agent command dispatcher', () => {
    beforeEach(() => {
        const data = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => data.get(key) ?? null,
            setItem: (key: string, value: string) => { data.set(key, value); },
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('saves once when the same request is retried, even after another edit', async () => {        const { dispatch, document } = editor();
        const save = request({ action: 'save', expectedRevision: 0 });
        const first = await dispatch(save);
        document.edit([{ op: 'set_metadata', name: 'Changed' }]);
        expect(await dispatch(save)).toEqual(first);
        expect(loadCustomLevels()).toHaveLength(1);
        expect(first).toMatchObject({ ok: true, data: { revision: 0, saved: { cols: 100 } } });
    });

    it('rejects reuse of an ID for a different command', async () => {        const { dispatch } = editor();
        const original = request({ action: 'get_level' });
        await dispatch(original);
        expect(await dispatch({ ...original, action: { action: 'save', expectedRevision: 0 } })).toMatchObject({ ok: false });
        expect(loadCustomLevels()).toEqual([]);
    });

    it('requires Admin for direct numbering and export, while importing existing metadata remains available', async () => {        const { dispatch } = editor();
        expect(await dispatch(request({
            action: 'edit', expectedRevision: 0, operations: [{ op: 'set_metadata', number: 2 }],
        }))).toMatchObject({ ok: false, error: expect.stringContaining('Admin') });
        expect(await dispatch(request({ action: 'export', expectedRevision: 0 }))).toMatchObject({ ok: false });
        expect(await dispatch(request({
            action: 'import', expectedRevision: 0, level: { version: 1, number: 2, name: '', cols: 30, cells: [] },
        }))).toMatchObject({ ok: true });
    });

    it('requires browser confirmation for destructive edits', async () => {        const { dispatch, context } = editor();
        context.confirm.mockReturnValue(false);
        expect(await dispatch(request({ action: 'edit', expectedRevision: 0, operations: [{ op: 'clear_cells' }] })))
            .toMatchObject({ ok: false, error: expect.stringContaining('declined') });
        expect(context.confirm).toHaveBeenCalledOnce();
    });

    it('does not execute expired requests or requests that expire during confirmation', async () => {        const { dispatch, context } = editor();
        expect(await dispatch({ ...request({ action: 'save', expectedRevision: 0 }), expiresAt: 1 })).toMatchObject({ ok: false });
        const now = Date.now();
        const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
        context.confirm.mockImplementation(() => { clock.mockReturnValue(now + 40000); return true; });
        try {
            expect(await dispatch(request({ action: 'edit', expectedRevision: 0, operations: [{ op: 'clear_cells' }] })))
                .toMatchObject({ ok: false, error: expect.stringContaining('expired') });
        } finally { clock.mockRestore(); }
        expect(loadCustomLevels()).toEqual([]);
    });

    it('rejects stale commands and leaves active paint strokes alone', async () => {        const { dispatch, document, context } = editor();
        document.edit([{ op: 'set_finish', col: 90 }]);
        expect(await dispatch(request({ action: 'save', expectedRevision: 0 }))).toMatchObject({ ok: false });
        context.isPainting = () => true;
        expect(await dispatch(request({ action: 'undo', expectedRevision: 1 })))
            .toMatchObject({ ok: false, error: expect.stringContaining('painting') });
    });

    it('surfaces corrupt storage and quota failures rather than overwriting saved data', async () => {        const { dispatch } = editor();
        localStorage.setItem('platformer_custom_levels', '{bad json');
        expect(await dispatch(request({ action: 'save', expectedRevision: 0 }))).toMatchObject({ ok: false });
        expect(localStorage.getItem('platformer_custom_levels')).toBe('{bad json');
        localStorage.setItem('platformer_custom_levels', '[]');
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
        expect(await dispatch(request({ action: 'save', expectedRevision: 0 })))
            .toMatchObject({ ok: false, error: expect.stringContaining('Quota') });
    });

    it('verifies production admin once per session and reports non-admins without caching them', async () => {
        const { dispatch, context } = editor();
        expect(await dispatch(request({ action: 'check_production_admin' })))
            .toMatchObject({ ok: true, data: { isAdmin: true, username: 'james' } });
        await dispatch(request({ action: 'check_production_admin' }));
        expect(context.signInProduction).toHaveBeenCalledOnce();

        const other = editor();
        other.context.signInProduction.mockResolvedValue({ username: 'pat', role: 'User', expiresAt: Date.now() + 60000 });
        expect(await other.dispatch(request({ action: 'check_production_admin' })))
            .toMatchObject({ ok: true, data: { isAdmin: false } });
        await other.dispatch(request({ action: 'check_production_admin' }));
        expect(other.context.signInProduction).toHaveBeenCalledTimes(2);

        other.context.signInProduction.mockResolvedValue(null);
        expect(await other.dispatch(request({ action: 'check_production_admin' })))
            .toMatchObject({ ok: false, error: expect.stringContaining('cancelled') });
    });

    it('shares one in-flight sign-in between retries of the same request', async () => {
        const { dispatch, context } = editor();
        const check = request({ action: 'check_production_admin' });
        const [first, second] = await Promise.all([dispatch(check), dispatch(check)]);
        expect(second).toEqual(first);
        expect(context.signInProduction).toHaveBeenCalledOnce();
    });

    it('publishes only for a verified production admin who approves a named, non-empty level', async () => {
        const { dispatch, document, context } = editor();
        const publish = (revision: number) => request({ action: 'publish_shipped', expectedRevision: revision, number: 2 });
        expect(await dispatch(publish(0))).toMatchObject({ ok: false, error: expect.stringContaining('check_production_admin') });
        await dispatch(request({ action: 'check_production_admin' }));
        expect(await dispatch(publish(0))).toMatchObject({ ok: false, error: expect.stringContaining('Name') });
        document.edit([{ op: 'set_metadata', name: 'Stairs' }]);
        expect(await dispatch(publish(1))).toMatchObject({ ok: false, error: expect.stringContaining('empty') });
        document.edit([{ op: 'set_finish', col: 50 }]);
        context.confirm.mockReturnValueOnce(false);
        expect(await dispatch(publish(2))).toMatchObject({ ok: false, error: expect.stringContaining('declined') });
        expect(await dispatch(publish(2))).toMatchObject({
            ok: true, data: { revision: 2, verifiedAdmin: 'james', level: { name: 'Stairs', number: 2 } },
        });
        expect(context.confirm).toHaveBeenLastCalledWith(expect.stringContaining('level 2'));
    });
});

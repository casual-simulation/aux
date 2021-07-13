import {
    asyncResult,
    AuxPartitions,
    AuxRuntime,
    BotAction,
    botAdded,
    createBot,
    createMemoryPartition,
    htmlPortalEvent,
    iteratePartitions,
    MemoryPartition,
    ON_PORTAL_SETUP_ACTION_NAME,
    registerHtmlPortal,
    setPortalOutput,
    stateUpdatedEvent,
    toast,
    updateHtmlPortal,
    UpdateHtmlPortalAction,
} from '@casual-simulation/aux-common';
import { waitAsync } from '@casual-simulation/aux-common/test/TestHelpers';
import { Subscription } from 'rxjs';
import { HtmlPortalBackend } from './HtmlPortalBackend';
import { v4 as uuid } from 'uuid';
import { AuxHelper } from '../vm';
import { skip, tap } from 'rxjs/operators';
import { h } from 'preact';
import htm from 'htm';

const uuidMock: jest.Mock = <any>uuid;
jest.mock('uuid');

describe('HtmlPortalBackend', () => {
    let runtime: AuxRuntime;
    let actions: BotAction[];
    let memory: MemoryPartition;
    let userId: string = 'user';
    let sub: Subscription;

    beforeEach(async () => {
        actions = [];
        sub = new Subscription();
        runtime = new AuxRuntime(
            {
                hash: 'hash',
                major: 1,
                minor: 0,
                patch: 0,
                version: 'v1.0.0',
            },
            {
                supportsAR: false,
                supportsVR: false,
                isCollaborative: true,
                ab1BootstrapUrl: 'ab1Bootstrap',
            }
        );
        memory = createMemoryPartition({
            type: 'memory',
            initialState: {},
        });
        memory.space = 'shared';

        await memory.applyEvents([botAdded(createBot('user'))]);
    });

    function createHelper(partitions: AuxPartitions) {
        runtime = new AuxRuntime(
            {
                hash: 'hash',
                major: 1,
                minor: 0,
                patch: 0,
                version: 'v1.0.0',
            },
            {
                supportsAR: false,
                supportsVR: false,
                isCollaborative: true,
                ab1BootstrapUrl: 'ab1Bootstrap',
            }
        );
        const helper = new AuxHelper(partitions, runtime);

        for (let [, partition] of iteratePartitions(partitions)) {
            sub.add(
                partition.onStateUpdated
                    .pipe(
                        tap((e) => {
                            runtime.stateUpdated(e);
                        })
                    )
                    .subscribe(null, (e: any) => console.error(e))
            );
        }

        runtime.userId = userId;
        sub.add(helper.localEvents.subscribe((a) => actions.push(...a)));

        return helper;
    }

    afterEach(() => {
        sub.unsubscribe();
    });

    it('should send a register_html_portal event when created', async () => {
        const helper = createHelper({
            shared: memory,
        });
        uuidMock.mockReturnValueOnce('uuid');

        let portal = new HtmlPortalBackend('testPortal', 'myBot', helper);

        await waitAsync();

        expect(actions).toEqual([registerHtmlPortal('testPortal', 'uuid')]);
    });

    describe('onPortalSetup', () => {
        it('should send a onRender action when the register_html_portal result is returned', async () => {
            const helper = createHelper({
                shared: memory,
            });
            await helper.transaction(
                botAdded(
                    createBot('myBot', {
                        [ON_PORTAL_SETUP_ACTION_NAME]: `@tags.rendered = true`,
                        rendered: false,
                    })
                )
            );

            uuidMock.mockReturnValueOnce('uuid');

            let portal = new HtmlPortalBackend('testPortal', 'myBot', helper);

            await waitAsync();

            expect(helper.botsState['myBot'].tags.rendered).toBe(false);

            portal.handleEvents([asyncResult('uuid', null)]);

            await waitAsync();

            expect(runtime.currentState['myBot'].values.rendered).toBe(true);
        });

        it('should include the HTML document in the onPortalSetup action', async () => {
            const helper = createHelper({
                shared: memory,
            });
            await helper.transaction(
                botAdded(
                    createBot('myBot', {
                        [ON_PORTAL_SETUP_ACTION_NAME]: `@that.document.body.appendChild(that.document.createElement('h1'))`,
                    })
                )
            );

            uuidMock.mockReturnValueOnce('uuid');

            let portal = new HtmlPortalBackend('testPortal', 'myBot', helper);

            await waitAsync();

            portal.handleEvents([asyncResult('uuid', null)]);

            await waitAsync();

            expect(actions.slice(1)).toEqual([
                registerHtmlPortal('testPortal', 'uuid'),
                updateHtmlPortal('testPortal', [
                    {
                        type: 'childList',
                        target: expect.objectContaining({
                            __id: '0',
                        }),
                        addedNodes: [
                            expect.objectContaining({
                                __id: '1',
                                nodeName: 'H1',
                            }),
                        ],
                        removedNodes: [],
                        attributeName: undefined,
                        attributeNamespace: undefined,
                        nextSibling: undefined,
                        previousSibling: undefined,
                        oldValue: undefined,
                    },
                ]),
            ]);
        });

        it('should call event listeners for the html_portal_event events', async () => {
            const helper = createHelper({
                shared: memory,
            });
            await helper.transaction(
                botAdded(
                    createBot('myBot', {
                        [ON_PORTAL_SETUP_ACTION_NAME]: `@let h1 = that.document.createElement('h1'); h1.addEventListener('click', () => tags.clicked = true); that.document.body.appendChild(h1);`,
                        clicked: false,
                    })
                )
            );

            uuidMock.mockReturnValueOnce('uuid');

            let portal = new HtmlPortalBackend('testPortal', 'myBot', helper);

            await waitAsync();

            portal.handleEvents([asyncResult('uuid', null)]);

            await waitAsync();

            portal.handleEvents([
                htmlPortalEvent('testPortal', {
                    type: 'click',
                    target: '1',
                }),
            ]);

            await waitAsync();

            expect(runtime.currentState['myBot'].values.clicked).toBe(true);
        });

        it('should emit an async result for the given register task ID', async () => {
            const helper = createHelper({
                shared: memory,
            });
            await helper.transaction(
                botAdded(
                    createBot('myBot', {
                        [ON_PORTAL_SETUP_ACTION_NAME]: `@os.toast("Hit")`,
                    })
                )
            );

            uuidMock.mockReturnValueOnce('uuid');

            let portal = new HtmlPortalBackend(
                'testPortal',
                'myBot',
                helper,
                'taskId'
            );

            await waitAsync();

            portal.handleEvents([asyncResult('uuid', null)]);

            await waitAsync();

            expect(actions.slice(2)).toEqual([
                toast('Hit'),
                asyncResult('taskId', null),
            ]);
        });
    });

    describe('set_portal_output', () => {
        it('should render the output as a preact component', async () => {
            const helper = createHelper({
                shared: memory,
            });

            uuidMock.mockReturnValueOnce('uuid');

            let portal = new HtmlPortalBackend('testPortal', 'myBot', helper);

            await waitAsync();

            const html = htm.bind(h);

            portal.handleEvents([asyncResult('uuid', null)]);
            portal.handleEvents([
                setPortalOutput('testPortal', html`<h1>Hello</h1>`),
            ]);

            await waitAsync();

            expect(actions.length).toBe(2);
            expect(actions[0]).toEqual(
                registerHtmlPortal('testPortal', 'uuid')
            );

            const updateAction = actions[1] as UpdateHtmlPortalAction;

            expect(updateAction).toMatchSnapshot();

            expect(updateAction.type).toBe('update_html_portal');
            expect(updateAction.portalId).toBe('testPortal');
            expect(updateAction.updates.length).toBe(1);
            expect(updateAction.updates[0].type).toBe('childList');
            expect(updateAction.updates[0].addedNodes.length).toBe(1);
            const h1Node = updateAction.updates[0].addedNodes[0] as any;
            expect(h1Node.nodeName).toBe('H1');
            expect(h1Node.childNodes.length).toBe(1);
            expect(h1Node.childNodes[0].nodeName).toBe('#text');
        });
    });
});

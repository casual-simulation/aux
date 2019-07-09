import { AuxUserAuthorizer } from './AuxUserAuthorizer';
import {
    USERNAME_CLAIM,
    ADMIN_ROLE,
    LoadedChannel,
    USER_ROLE,
} from '@casual-simulation/causal-tree-server';
import { Subscription } from 'rxjs';
import {
    AuxCausalTree,
    createFile,
    GLOBALS_FILE_ID,
} from '@casual-simulation/aux-common';
import { storedTree, site } from '@casual-simulation/causal-trees';

describe('AuxUserAuthorizer', () => {
    let authorizer: AuxUserAuthorizer;
    let tree: AuxCausalTree;
    let channel: LoadedChannel;

    beforeEach(async () => {
        tree = new AuxCausalTree(storedTree(site(1)));
        channel = {
            info: {
                id: 'test',
                type: 'aux',
            },
            subscription: new Subscription(),
            tree: tree,
        };
        authorizer = new AuxUserAuthorizer();
    });

    it('should throw if the channel type is not aux', () => {
        channel = {
            info: {
                id: 'test',
                type: 'something else',
            },
            subscription: new Subscription(),
            tree: tree,
        };

        expect(() => {
            authorizer.isAllowedAccess(
                {
                    claims: {
                        [USERNAME_CLAIM]: 'test',
                    },
                    roles: [ADMIN_ROLE],
                },
                channel
            );
        }).toThrow();
    });

    it('should deny access when given null', () => {
        const allowed = authorizer.isAllowedAccess(null, channel);

        expect(allowed).toBe(false);
    });

    it('should always allow a user in the admin role', () => {
        const allowed = authorizer.isAllowedAccess(
            {
                claims: {
                    [USERNAME_CLAIM]: 'test',
                },
                roles: [ADMIN_ROLE],
            },
            channel
        );

        expect(allowed).toBe(true);
    });

    it('should not allow users without the user role', () => {
        const allowed = authorizer.isAllowedAccess(
            {
                claims: {
                    [USERNAME_CLAIM]: 'test',
                },
                roles: [],
            },
            channel
        );

        expect(allowed).toBe(false);
    });

    describe('whitelist', () => {
        const whitelistCases = [
            ['should allow users in the whitelist', 'test', ['test'], true],
            [
                'should reject users not in the whitelist',
                'not_test',
                ['test'],
                false,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                username: string,
                whitelist: any,
                expected: boolean
            ) => {
                await tree.root();
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.whitelist': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: username,
                        },
                        roles: [USER_ROLE],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });

    describe('blacklist', () => {
        const whitelistCases = [
            ['should reject users in the blacklist', 'test', ['test'], false],
            [
                'should allow users not in the blacklist',
                'not_test',
                ['test'],
                true,
            ],
        ];

        it.each(whitelistCases)(
            '%s',
            async (
                desc: string,
                username: string,
                whitelist: any,
                expected: boolean
            ) => {
                await tree.root();
                await tree.addFile(
                    createFile(GLOBALS_FILE_ID, {
                        'aux.blacklist': whitelist,
                    })
                );

                let allowed = authorizer.isAllowedAccess(
                    {
                        claims: {
                            [USERNAME_CLAIM]: username,
                        },
                        roles: [USER_ROLE],
                    },
                    channel
                );

                expect(allowed).toBe(expected);
            }
        );
    });
});

import {
    Weave,
    atom,
    atomId,
    SiteStatus,
    newSite,
    createAtom,
    iterateCausalGroup,
    Atom,
    WeaveNode,
} from '@casual-simulation/causal-trees/core2';
import {
    AuxOp,
    bot,
    tag,
    value,
    deleteOp,
    insertOp,
    tagMask,
    ValueOp,
} from './AuxOpTypes';
import {
    findTagNode,
    findValueNode,
    findBotNode,
    findEditPosition,
    calculateOrderedEdits,
    TextSegment,
    findMultipleEditPositions,
    calculateFinalEditValue,
} from './AuxWeaveHelpers';
import { createBot } from '../bots';
import reducer from './AuxWeaveReducer';
import { apply } from './AuxStateHelpers';

describe('AuxWeaveHelpers', () => {
    describe('findBotNode()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        it('should find the first node that defines the given bot', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));

            weave.insert(b1);

            const result = findBotNode(weave, 'test');

            expect(result.atom).toBe(b1);
        });

        it('should find the first node that defines the given bot that is not deleted', () => {
            const b1A = atom(atomId('a', 1), null, bot('test'));
            const del1A = atom(atomId('a', 2), b1A, deleteOp());
            const b1B = atom(atomId('a', 3), null, bot('test'));

            weave.insert(b1A);
            weave.insert(del1A);
            weave.insert(b1B);

            const result = findBotNode(weave, 'test');

            expect(result.atom).toBe(b1B);
        });

        it('should return null if no bots match the given ID', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));

            weave.insert(b1);

            const result = findBotNode(weave, 'missing');

            expect(result).toBe(null);
        });
    });

    describe('findTagNode()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        it('should find the first node that defines the given tag', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            weave.insert(b1);
            weave.insert(t1);
            const botNode = weave.getNode(b1.id);

            const result = findTagNode(botNode, 'abc');

            expect(result.atom).toBe(t1);
        });

        it('should return null if no tags match the given name', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            weave.insert(b1);
            weave.insert(t1);
            const botNode = weave.getNode(b1.id);

            const result = findTagNode(botNode, 'missing');

            expect(result).toBe(null);
        });
    });

    describe('findValueNode()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        it('should find the last value node for the given tag', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));
            const v1 = atom(atomId('a', 3), t1, value('123'));
            const v2 = atom(atomId('a', 4), t1, value('999'));

            weave.insert(b1);
            weave.insert(t1);
            weave.insert(v1);
            weave.insert(v2);

            const tagNode = weave.getNode(t1.id);

            const result = findValueNode(tagNode);

            expect(result.atom).toBe(v2);
        });

        it('should return null if no tags are value tags', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            weave.insert(b1);
            weave.insert(t1);

            const tagNode = weave.getNode(t1.id);

            const result = findValueNode(tagNode);

            expect(result).toBe(null);
        });
    });

    describe('findEditPosition()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        const b1 = atom(atomId('a', 1), null, bot('test'));
        const t1 = atom(atomId('a', 2), b1, tag('abc'));
        const v1 = atom(atomId('a', 3), t1, value('111'));
        const i1 = atom(atomId('a', 4), v1, insertOp(0, '222'));
        const i2 = atom(atomId('a', 5), v1, insertOp(2, '333'));
        // value: 222113331
        const d1 = atom(atomId('a', 6), v1, deleteOp(1, 2));
        const d2 = atom(atomId('a', 7), i1, deleteOp(1, 2));
        const d3 = atom(atomId('a', 8), i2, deleteOp(1, 2));
        // value: 221331

        const i3 = atom(atomId('b', 4), v1, insertOp(1, '444'));
        // value: 221334441

        // value: 1•1
        ///

        it('should be able to insert into a value', () => {
            insertAtoms(b1, t1, v1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 3,
                },
                2
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(2);
        });

        it('should be able to insert into an insert added at the beginning of a value', () => {
            insertAtoms(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 4,
                },
                2
            );
            expect(result.node.atom).toBe(i1);
            expect(result.index).toBe(2);
        });

        it('should be able to insert into a value at a time before an insert', () => {
            insertAtoms(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 3,
                },
                2
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(2);
        });

        it('should be able to insert into an insert added at the end of a value', () => {
            insertAtoms(b1, t1, v1, i2);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                3
            );
            expect(result.node.atom).toBe(i2);
            expect(result.index).toBe(1);
        });

        it('should be able to insert between a value and insert added at the end of the value', () => {
            insertAtoms(b1, t1, v1, i2);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                2
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(2);
        });

        it('should be able to insert between a value and insert added at the beginning of the value', () => {
            insertAtoms(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                3
            );
            expect(result.node.atom).toBe(i1);
            expect(result.index).toBe(3);
        });

        it('should be able to insert between a value and inserts surrounding it', () => {
            insertAtoms(b1, t1, v1, i1, i2);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                4
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(1);
        });

        it('should be able to insert between a value and inserts surrounding it', () => {
            insertAtoms(b1, t1, v1, i1, i2);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                4
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(1);
        });

        it('should be able to insert a value after a deleted character', () => {
            insertAtoms(b1, t1, v1, d1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 8,
                },
                2
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(3);
        });

        it('should be able to insert into an empty value', () => {
            const v1 = atom(atomId('a', 3), t1, value(''));
            insertAtoms(b1, t1, v1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 5,
                },
                0
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(0);
        });

        it('should be able to insert a value into another site insert', () => {
            insertAtoms(b1, t1, v1, i3);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 8,
                    b: 4,
                },
                2
            );
            expect(result.node.atom).toBe(i3);
            expect(result.index).toBe(1);
        });

        it('should ignore sites that are not included in the given version', () => {
            insertAtoms(b1, t1, v1, i3);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 8,
                },
                2
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(2);
        });

        it('should return the index after a sequence of deleted characters', () => {
            insertAtoms(b1, t1, v1, d1);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 8,
                    b: 4,
                },
                1
            );
            expect(result.node.atom).toBe(v1);
            expect(result.index).toBe(2);
        });

        it('should return the list of edit positions when a delete spans multiple inserts', () => {
            insertAtoms(b1, t1, v1, i1, i2);

            const valueNode = weave.getNode(v1.id);

            const result = findEditPosition(
                valueNode,
                {
                    a: 8,
                    b: 4,
                },
                0,
                9
            );
            expect(Array.isArray(result)).toBe(true);
            const mapped = result.map((r) => ({
                atom: r.node.atom,
                index: r.index,
                count: r.count,
            }));
            expect(mapped).toEqual([
                { index: 0, count: 3, atom: i1 },
                { index: 0, count: 2, atom: v1 },
                { index: 0, count: 3, atom: i2 },
                { index: 2, count: 1, atom: v1 },
            ]);
        });

        const cases = [
            // ["time+atom(index)", timestamp, index, expectedAtom, expectedIndex]
            ['3+v1(0)', 3, 0, v1, 0] as const,
            ['3+v1(1)', 3, 1, v1, 1] as const,
            ['4+i1(0)', 4, 0, i1, 0] as const,
            ['4+i1(1)', 4, 1, i1, 1] as const,
            ['4+i1(3)', 4, 3, i1, 3] as const,
            ['4+v1(1)', 4, 4, v1, 1] as const,
            ['5+i1(0)', 5, 0, i1, 0] as const,
            ['5+i1(1)', 5, 1, i1, 1] as const,
            ['5+i1(3)', 5, 3, i1, 3] as const,
            ['5+v1(2)', 5, 5, v1, 2] as const,
            ['5+v1(3)', 5, 9, v1, 3] as const,
            ['5+i2(1)', 5, 6, i2, 1] as const,
            ['5+i2(2)', 5, 7, i2, 2] as const,
        ];

        describe.each(cases)(
            '%s',
            (desc, timestamp, index, expectedAtom, expectedIndex) => {
                it('should find the insert atom that the given index is pointing to', () => {
                    insertAtoms(b1, t1, v1, i1, i2);

                    const valueNode = weave.getNode(v1.id);

                    const result = findEditPosition(
                        valueNode,
                        {
                            a: timestamp,
                        },
                        index
                    );
                    expect(result.node.atom).toBe(expectedAtom);
                    expect(result.index).toBe(expectedIndex);
                });
            }
        );

        function insertAtoms(...atoms: Atom<AuxOp>[]) {
            for (let atom of atoms) {
                const result = weave.insert(atom);
                if (result.type !== 'atom_added') {
                    throw new Error('Unable to add atom: ' + result.type);
                }
            }
        }
    });

    describe('calculateOrderedEdits()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        it('should treat value nodes as a segment', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));

            insert(b1, t1, v1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '111', marked: '111', offset: 0, atom: v1 },
            ]);
        });

        it('should remove deleted sections from value nodes', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));

            insert(b1, t1, v1, d0);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '11', marked: '1•1', offset: 0, atom: v1 },
            ]);
        });

        it('should not report empty text segments', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(0, 3));

            insert(b1, t1, v1, d0);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([]);
        });

        it('should support multiple delete atoms on a single value node', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            const d1 = atom(atomId('a', 5, 1), v1, deleteOp(2, 3));

            insert(b1, t1, v1, d0, d1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1••', offset: 0, atom: v1 },
            ]);
        });

        it('should support overlapping delete atoms on a single value node', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            const d1 = atom(atomId('a', 5, 1), v1, deleteOp(1, 3));

            insert(b1, t1, v1, d0, d1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1••', offset: 0, atom: v1 },
            ]);
        });

        it('should remove deleted sections from insert nodes', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(1, '222'));
            const d0 = atom(atomId('a', 5, 1), i1, deleteOp(1, 2));

            insert(b1, t1, v1, i1, d0);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1', offset: 0, atom: v1 },
                { text: '22', marked: '2•2', offset: 0, atom: i1 },
                { text: '11', marked: '11', offset: 1, atom: v1 },
            ]);
        });

        it('should support multiple delete atoms on a single insert node', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(1, '222'));
            const d0 = atom(atomId('a', 5, 1), i1, deleteOp(1, 2));
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(2, 3));

            insert(b1, t1, v1, i1, d0, d1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1', offset: 0, atom: v1 },
                { text: '2', marked: '2••', offset: 0, atom: i1 },
                { text: '11', marked: '11', offset: 1, atom: v1 },
            ]);
        });

        it('should support overlapping delete atoms on a single insert node', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(1, '222'));
            const d0 = atom(atomId('a', 5, 1), i1, deleteOp(1, 2));
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(1, 3));

            insert(b1, t1, v1, i1, d0, d1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1', offset: 0, atom: v1 },
                { text: '2', marked: '2••', offset: 0, atom: i1 },
                { text: '11', marked: '11', offset: 1, atom: v1 },
            ]);
        });

        it('should treat insert nodes as a segment', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(3, '222'));

            insert(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '111', marked: '111', offset: 0, atom: v1 },
                { text: '222', marked: '222', offset: 0, atom: i1 },
            ]);
        });

        it('should place insert operations with a zero index before the value operation', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(0, '222'));

            insert(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '222', marked: '222', offset: 0, atom: i1 },
                { text: '111', marked: '111', offset: 0, atom: v1 },
            ]);
        });

        it('should split a text segment if an insert is in the middle', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(1, '222'));

            insert(b1, t1, v1, i1);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1', offset: 0, atom: v1 },
                { text: '222', marked: '222', offset: 0, atom: i1 },
                { text: '11', marked: '11', offset: 1, atom: v1 },
            ]);
        });

        it('should support sibling inserts on a value', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(1, '222'));
            const i2 = atom(atomId('a', 5), v1, insertOp(2, '333'));

            insert(b1, t1, v1, i1, i2);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '1', marked: '1', offset: 0, atom: v1 },
                { text: '222', marked: '222', offset: 0, atom: i1 },
                { text: '1', marked: '1', offset: 1, atom: v1 },
                { text: '333', marked: '333', offset: 0, atom: i2 },
                { text: '1', marked: '1', offset: 2, atom: v1 },
            ]);
        });

        it('should support sibling inserts that are right next to each other', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(3, '222'));
            const i2 = atom(atomId('a', 5), v1, insertOp(3, '333'));

            insert(b1, t1, v1, i1, i2);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '111', marked: '111', offset: 0, atom: v1 },
                { text: '333', marked: '333', offset: 0, atom: i2 },
                { text: '222', marked: '222', offset: 0, atom: i1 },
            ]);
        });

        it('should support inserts that are between other inserts', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            const i1 = atom(atomId('a', 4), v1, insertOp(2, '222'));
            const i2 = atom(atomId('a', 5), v1, insertOp(3, '333'));
            const i3 = atom(atomId('a', 6), i1, insertOp(3, '444'));

            insert(b1, t1, v1, i1, i2, i3);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '11', marked: '11', offset: 0, atom: v1 },
                { text: '222', marked: '222', offset: 0, atom: i1 },
                { text: '444', marked: '444', offset: 0, atom: i3 },
                { text: '1', marked: '1', offset: 2, atom: v1 },
                { text: '333', marked: '333', offset: 0, atom: i2 },
            ]);
        });

        it('should split inserts and deletes into a sequence of edits', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            // 111
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            // 11
            const i1 = atom(atomId('a', 5), v1, insertOp(0, '222'));
            // 22211
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(2, 3));
            // 2211
            const i2 = atom(atomId('a', 7), v1, insertOp(2, '333'));
            // 2213331 - insert is in the middle of v1 because it should apply to "111" and not "11"
            const i3 = atom(atomId('a', 9), i1, insertOp(2, '444'));
            // 2244413331
            const d3 = atom(atomId('a', 10, 1), i3, deleteOp(2, 3));
            // 224413331

            insert(b1, t1, v1, d0, i1, d1, i2, i3, d3);

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '22', marked: '22', offset: 0, atom: i1 },
                { text: '44', marked: '44•', offset: 0, atom: i3 },
                { text: '1', marked: '1•', offset: 0, atom: v1 },
                { text: '333', marked: '333', offset: 0, atom: i2 },
                { text: '1', marked: '1', offset: 2, atom: v1 },
            ]);
        });

        it('should report the same value as the reducer', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            // 111
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            // 11
            const i1 = atom(atomId('a', 5), v1, insertOp(0, '222'));
            // 22211
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(2, 3));
            // 2211
            const i2 = atom(atomId('a', 7), v1, insertOp(2, '333'));
            // 2213331 - insert is in the middle of v1 because it should apply to "111" and not "11"
            const i3 = atom(atomId('a', 9), i1, insertOp(2, '444'));
            // 2244413331
            const d3 = atom(atomId('a', 10, 1), i3, deleteOp(2, 3));
            // 224413331

            let atoms = [b1, t1, v1, d0, i1, d1, i2, i3, d3];
            let state = {};
            for (let atom of atoms) {
                const weaveResult = weave.insert(atom);
                const update = reducer(weave, weaveResult);
                state = apply(state, update);
            }

            const valueNode = weave.getNode(v1.id);
            const nodes = [valueNode, ...iterateCausalGroup(valueNode)];

            const segments = calculateOrderedEdits(nodes);

            const result = segments.map((s) => ({
                text: s.text,
                marked: s.marked.replace(/\0/g, '•'),
                offset: s.offset,
                atom: s.node.atom,
            }));

            expect(result).toEqual([
                { text: '22', marked: '22', offset: 0, atom: i1 },
                { text: '44', marked: '44•', offset: 0, atom: i3 },
                { text: '1', marked: '1•', offset: 0, atom: v1 },
                { text: '333', marked: '333', offset: 0, atom: i2 },
                { text: '1', marked: '1', offset: 2, atom: v1 },
            ]);
            expect(state).toEqual({
                test: createBot('test', {
                    abc: '224413331',
                }),
            });
        });

        function insert(...atoms: Atom<AuxOp>[]) {
            for (let atom of atoms) {
                const result = weave.insert(atom);
                if (result.type !== 'atom_added') {
                    throw new Error(
                        'Unable to add atom to weave: ' + result.type
                    );
                }
            }
        }
    });

    describe('calculateFinalEditValue()', () => {
        let weave: Weave<AuxOp>;

        beforeEach(() => {
            weave = new Weave();
        });

        it('should calculate the final text value for tags', () => {
            const b1 = atom(atomId('a', 1), null, bot('test'));
            const t1 = atom(atomId('a', 2), b1, tag('abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            // 111
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            // 11
            const i1 = atom(atomId('a', 5), v1, insertOp(0, '222'));
            // 22211
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(2, 3));
            // 2211
            const i2 = atom(atomId('a', 7), v1, insertOp(2, '333'));
            // 2213331 - insert is in the middle of v1 because it should apply to "111" and not "11"
            const i3 = atom(atomId('a', 9), i1, insertOp(2, '444'));
            // 2244413331
            const d3 = atom(atomId('a', 10, 1), i3, deleteOp(2, 3));
            // 224413331

            insert(b1, t1, v1, d0, i1, d1, i2, i3, d3);

            const result = calculateFinalEditValue(
                weave.getNode(v1.id) as WeaveNode<ValueOp>
            );

            expect(result).toEqual('224413331');
        });

        it('should calculate the final text value for tag masks', () => {
            const t1 = atom(atomId('a', 2), null, tagMask('test', 'abc'));

            const v1 = atom(atomId('a', 3), t1, value('111'));
            // 111
            const d0 = atom(atomId('a', 4, 1), v1, deleteOp(1, 2));
            // 11
            const i1 = atom(atomId('a', 5), v1, insertOp(0, '222'));
            // 22211
            const d1 = atom(atomId('a', 6, 1), i1, deleteOp(2, 3));
            // 2211
            const i2 = atom(atomId('a', 7), v1, insertOp(2, '333'));
            // 2213331 - insert is in the middle of v1 because it should apply to "111" and not "11"
            const i3 = atom(atomId('a', 9), i1, insertOp(2, '444'));
            // 2244413331
            const d3 = atom(atomId('a', 10, 1), i3, deleteOp(2, 3));
            // 224413331

            insert(t1, v1, d0, i1, d1, i2, i3, d3);

            const result = calculateFinalEditValue(
                weave.getNode(v1.id) as WeaveNode<ValueOp>
            );

            expect(result).toEqual('224413331');
        });

        function insert(...atoms: Atom<AuxOp>[]) {
            for (let atom of atoms) {
                const result = weave.insert(atom);
                if (result.type !== 'atom_added') {
                    throw new Error(
                        'Unable to add atom to weave: ' + result.type
                    );
                }
            }
        }
    });

    describe('findMultipleEditPositions()', () => {
        it('should return the node and index that the deletes start at', () => {
            const a1 = textSegment('a1', 'abcdef');

            const positions = [
                ...findMultipleEditPositions(0, 1, [a1], 'right'),
            ];

            expect(positions).toEqual([
                {
                    index: 0,
                    count: 1,
                    node: 'a1',
                },
            ]);
        });

        it('should support covering multiple segments', () => {
            const a1 = textSegment('a1', 'ab');
            const a2 = textSegment('a2', 'cd');
            const a3 = textSegment('a3', 'ef');

            const positions = [
                ...findMultipleEditPositions(0, 6, [a1, a2, a3], 'right'),
            ];

            expect(positions).toEqual([
                {
                    index: 0,
                    count: 2,
                    node: 'a1',
                },
                {
                    index: 0,
                    count: 2,
                    node: 'a2',
                },
                {
                    index: 0,
                    count: 2,
                    node: 'a3',
                },
            ]);
        });

        it('should return the correct count for segments that have deleted characters between the start and end', () => {
            const a1 = textSegment('a1', 'a••b');

            const positions = [
                ...findMultipleEditPositions(0, 2, [a1], 'right'),
            ];

            expect(positions).toEqual([
                {
                    index: 0,
                    count: 4,
                    node: 'a1',
                },
            ]);
        });

        it('should handle deleting from multiple segments that have some deleted characters', () => {
            const a1 = textSegment('a1', '•ab');
            const a2 = textSegment('a2', 'c•d');
            const a3 = textSegment('a3', 'ef•');

            const positions = [
                ...findMultipleEditPositions(0, 6, [a1, a2, a3], 'right'),
            ];

            expect(positions).toEqual([
                {
                    index: 1,
                    count: 2,
                    node: 'a1',
                },
                {
                    index: 0,
                    count: 3,
                    node: 'a2',
                },
                {
                    index: 0,
                    count: 2,
                    node: 'a3',
                },
            ]);
        });

        it('should handle deleting from multiple segments when the start position happens to match the end of a segment', () => {
            const a1 = textSegment('a1', 'a');
            const a2 = textSegment('a2', 'b');
            const a3 = textSegment('a3', 'c');
            const a4 = textSegment('a4', 'd');
            const a5 = textSegment('a5', 'e');
            const a6 = textSegment('a6', 'f');
            const a7 = textSegment('a7', 'g');

            const positions = [
                ...findMultipleEditPositions(
                    2,
                    3,
                    [a1, a2, a3, a4, a5, a6, a7],
                    'right'
                ),
            ];

            expect(positions).toEqual([
                {
                    index: 0,
                    count: 1,
                    node: 'a3',
                },
                {
                    index: 0,
                    count: 1,
                    node: 'a4',
                },
                {
                    index: 0,
                    count: 1,
                    node: 'a5',
                },
            ]);
        });

        it('should handle deleting from multiple segments when the start position happens to in the middle of a segment', () => {
            const a1 = textSegment('a1', 'abcd');
            const a2 = textSegment('a2', 'efgh');
            const a3 = textSegment('a3', 'ijklmnop');
            const a4 = textSegment('a4', 'qrstuv');

            const positions = [
                ...findMultipleEditPositions(2, 20, [a1, a2, a3, a4], 'right'),
            ];

            expect(positions).toEqual([
                {
                    index: 2,
                    count: 2,
                    node: 'a1',
                },
                {
                    index: 0,
                    count: 4,
                    node: 'a2',
                },
                {
                    index: 0,
                    count: 8,
                    node: 'a3',
                },
                {
                    index: 0,
                    count: 6,
                    node: 'a4',
                },
            ]);
        });
    });
});

function textSegment(id: string, text: string): TextSegment {
    return {
        text: text.replace(/•/g, ''),
        marked: text.replace(/•/g, '\0'),
        node: <any>id,
        offset: 0,
    };
}

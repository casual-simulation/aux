import { assign } from 'lodash';
import uuidv5 from 'uuid/v5';
import {
    AtomId,
    atomIdToString,
} from '@casual-simulation/causal-trees/core2/Atom2';

/**
 * The list of operation types.
 */
export enum AuxOpType {
    root = 0,
    file = 1,
    tag = 2,
    value = 3,
    delete = 4,
    insert = 5,
}

/**
 * Defines a union of all the possible op types.
 */
export type AuxOp = FileOp | TagOp | ValueOp | InsertOp | DeleteOp;

/**
 * Defines an interface for all the AUX atom values.
 */
export interface AuxOpBase {
    /**
     * The type of the operation.
     */
    type: AuxOpType;
}

/**
 * Defines an atom value that instructs the system to create a file.
 */
export interface FileOp extends AuxOpBase {
    type: AuxOpType.file;
}

/**
 * Defines an atom value that instructs the system to create or rename a tag on a file.
 *
 * When two tags exist with the same name
 */
export interface TagOp extends AuxOpBase {
    type: AuxOpType.tag;

    /**
     * The name of the tag.
     */
    name: string;
}

/**
 * Defines an atom value that serves as the root for changes to the value of a tag.
 */
export interface ValueOp extends AuxOpBase {
    type: AuxOpType.value;

    /**
     * The initial value.
     */
    value: any;
}

/**
 * Defines an atom value that instructs the system to insert a set of text into a tag.
 * When inserting into a ValueOp this acts as inserting text into the value part of a tag.
 * When inserting into a TagOp this acts as inserting text into the name part of a tag.
 */
export interface InsertOp extends AuxOpBase {
    type: AuxOpType.insert;

    /**
     * The index that the text should be inserted into.
     * Note that this index refers to the previous insertion operation and
     * not the full text string.
     */
    index: number;

    /**
     * The text to insert.
     */
    text: string;
}

/**
 * Defines an atom value that instructs the system to delete an item.
 * If applied onto a file, the file will be deleted.
 * If applied to an insert operation, the specified substring will be deleted from that insertion's text.
 */
export interface DeleteOp extends AuxOpBase {
    type: AuxOpType.delete;

    /**
     * The start index of the substring to delete.
     * If not specified the entire parent element will be tombstoned.
     */
    start?: number;

    /**
     * The end index of the substring to delete.
     */
    end?: number;
}

/**
 * Creates a file atom op.
 */
export function file(): FileOp {
    return op<FileOp>(AuxOpType.file, {});
}

/**
 * Creates a tag atom op.
 */
export function tag(name: string): TagOp {
    return op<TagOp>(AuxOpType.tag, {
        name,
    });
}

/**
 * Creates a value op.
 * @param value The initial value for the tag.
 */
export function value(value: any): ValueOp {
    return op<ValueOp>(AuxOpType.value, {
        value,
    });
}

/**
 * Creates an insert op.
 * @param index The index to insert the text at.
 * @param text The text to insert.
 */
export function insert(index: number, text: string): InsertOp {
    return op<InsertOp>(AuxOpType.insert, {
        index,
        text,
    });
}

/**
 * Creates a delete op.
 * @param index The index to insert the text at.
 */
export function del(start?: number, end?: number): DeleteOp {
    return op<DeleteOp>(AuxOpType.delete, {
        start,
        end,
    });
}

export function op<T extends AuxOp>(type: T['type'], extra: Partial<T>): T {
    return <T>assign(
        {
            type: type,
        },
        extra
    );
}

export const AUX_FILE_ID_NAMESPACE = 'a629c7a7-2cf7-423f-b7de-de06efbea32b';

/**
 * Calculates the File ID for the given atom ID.
 * @param atomId The atom.
 */
export function fileId(atomId: AtomId): string {
    return uuidv5(atomIdToString(atomId), AUX_FILE_ID_NAMESPACE);
}

import { DNA_TAG_PREFIX } from '../Bot';

export const possibleTagNameCases = [
    ['""', ''] as const,
    ['0', '0'] as const,
    ['"a"', 'a'] as const,
    ['1', '1'] as const,
    ['-10', '-10'] as const,
    ['"1"', '1'] as const,
    ['".5"', '.5'] as const,
    ['.5', '0.5'] as const,
    ['false', 'false'] as const,
    ['"false"', 'false'] as const,
    ['true', 'true'] as const,
    ['"true"', 'true'] as const,
];
export const possibleTagValueCases = [
    ['', ''] as const,
    [null as any, null as any] as const,
    [0, 0] as const,
    [`${DNA_TAG_PREFIX}false`, false] as const,
    [`${DNA_TAG_PREFIX}0`, 0] as const,
    ['a', 'a'] as const,
    [1, 1] as const,
    [-10, -10] as const,
    ['1', 1] as const,
    ['.5', 0.5] as const,
    [false, false] as const,
    ['false', false] as const,
    [true, true] as const,
    ['true', true] as const,
    [`${DNA_TAG_PREFIX}1`, 1] as const,
    [`${DNA_TAG_PREFIX}"hello"`, 'hello'] as const,
];

export function booleanTagValueTests(
    defaultValue: boolean,
    testFunc: (given: any, expected: boolean) => void
) {
    let cases = [
        ['', defaultValue],
        [null, defaultValue],
        [undefined, defaultValue],
        [0, defaultValue],
        ['=false', defaultValue],
        ['=0', defaultValue],
        ['a', defaultValue],
        [1, defaultValue],
        [false, false],
        ['false', false],
        [true, true],
        ['true', true],
        [new Boolean(true), true],
        [new Boolean(false), false],
        ['=1', defaultValue],
        ['="hello"', defaultValue],
    ];

    it.each(cases)('should map %s to %s', testFunc);
}

export function numericalTagValueTests(
    defaultValue: number,
    testFunc: (given: any, expected: number) => void
) {
    let cases = [
        ['', defaultValue],
        [null, defaultValue],
        [undefined, defaultValue],
        [0, 0],
        ['=false', defaultValue],
        ['=0', defaultValue],
        ['a', defaultValue],
        [1, 1],
        [-10, -10],
        ['1', 1],
        ['.5', 0.5],
        [false, defaultValue],
        ['false', defaultValue],
        [true, defaultValue],
        ['true', defaultValue],
        ['=1', defaultValue],
        ['="hello"', defaultValue],
    ];

    it.each(cases)('should map %s to %s', testFunc);
}

export function stringTagValueTests(
    defaultValue: string,
    testFunc: (given: any, expected: string) => void
) {
    let cases = [
        ['', ''],
        [null, defaultValue],
        [undefined, defaultValue],
        [0, defaultValue],
        ['=false', '=false'],
        ['=0', '=0'],
        ['a', 'a'],
        [1, defaultValue],
        ['1', defaultValue],
        ['.5', defaultValue],
        [false, defaultValue],
        ['false', defaultValue],
        [true, defaultValue],
        ['true', defaultValue],
        ['=1', '=1'],
        ['="hello"', '="hello"'],
    ];

    it.each(cases)('should map %s to %s', testFunc);
}

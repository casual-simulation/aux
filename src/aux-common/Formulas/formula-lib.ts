import { File } from '../Files/File';
import { FileUpdatedEvent, FileEvent, FileAddedEvent, action, FilesState, calculateActionEvents, FileRemovedEvent, fileRemoved, fileAdded } from "../Files/FilesChannel";
import uuid from 'uuid/v4';
import { every } from "lodash";
import { isProxy, proxyObject } from "../Files/FileProxy";

let actions: FileEvent[] = [];
let state: FilesState = null;

export function setActions(value: FileEvent[]) {
    actions = value;
}

export function getActions(): FileEvent[] {
    return actions;
}

export function setFileState(value: FilesState) {
    state = value;
}

export function getFileState(): FilesState {
    return state;
}

// declare const lib: string;
// export default lib;

/**
 * Sums the given array of numbers and returns the result.
 * If any value in the list is not a number, it will be converted to one.
 * If the given value is not an array, then it will be converted to a number and returned.
 * 
 * @param list The value that should be summed. If it is a list, then the result will be the sum of the items in the list.
 *             If it is not a list, then the result will be the value converted to a number.
 */
export function sum(list: any): number {
    if (!Array.isArray(list)) {
        return parseFloat(list);
    }

    let carry = 0;
    for (let i = 0; i < list.length; i++) {
        const l = list[i];
        if (!Array.isArray(l)) {
            carry += parseFloat(l);
        } else {
            carry += sum(l);
        }
    }
    return carry;
}

/**
 * Calculates the average of the numbers in the given list and returns the result.
 * @param list The value that should be averaged.
 *             If it is a list, then the result will be sum(list)/list.length.
 *             If it is not a list, then the result will be the value converted to a number.
 */
export function avg(list: any) {
    if(!Array.isArray(list)) {
        return parseFloat(list);
    }

    let total = sum(list);
    let count = list.length;
    return total/count;
}

/**
 * Calculates the square root of the given number.
 * @param value The number.
 */
export function sqrt(value: any) {
    return Math.sqrt(parseFloat(value));
}

/**
 * Calculates the absolute value of a number.
 * @param number The number to get the absolute value of.
 */
export function abs(number: any) {
    return Math.abs(parseFloat(number));
}

/**
 * Calculates the standard deviation of the numbers in the given list and returns the result.
 * 
 * @param list The value that the standard deviation should be calculated for.
 */
export function stdDev(list: any) {
    if(!Array.isArray(list)) {
        list = [parseFloat(list)];
    }

    let mean = avg(list);
    let numbersMinusMean = list.map((l: number) => (l - mean) * (l - mean));

    let standardMean = avg(numbersMinusMean);
    return sqrt(standardMean);
}

/**
 * Sorts the given array in ascending order and returns the sorted values in a new array.
 * @param array The array of numbers to sort.
 */
export function sort(array: any[], direction: ('ASC' | 'DESC') = 'ASC'): any[] {
    let newArray = array.slice();
    let isAscending = direction.toUpperCase() !== 'DESC';
    if (isAscending) {
        return newArray.sort((a, b) => a - b);
    } else {
        return newArray.sort((a, b) => b - a);
    }
}

/**
 * Generates a random integer number between min and max.
 * @param min The smallest allowed value.
 * @param max The largest allowed value.
 */
export function randomInt(min: number = 0, max?: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    const rand = Math.random();
    if (max) {
        return Math.floor(rand * (max - min)) + min;
    } else {
        return Math.floor(rand) + min;
    }
}

/**
 * Generates a random number between min and max.
 * @param min The smallest allowed value.
 * @param max The largest allowed value.
 */
export function random(min: number = 0, max?: number): number {
    const rand = Math.random();
    if (max) {
        return rand * (max - min) + min;
    } else {
        return rand + min;
    }
}

/**
 * Joins the given list of values into a single string.
 * @param values The values to make the string out of.
 * @param separator The separator used to separate values.
 */
export function join(values: any, separator: string = ','): string {
    if (Array.isArray(values)) {
        return values.join(separator);
    } else {
        return values;
    }
}

/**
 * Removes the given file or file ID from the simulation.
 * @param file The file or file ID to remove from the simulation.
 */
export function destroy(file: File | string) {
    let id: string;
    if (typeof file === 'object') {
        id = file.id;
    } else if (typeof file === 'string') {
        id = file;
    }

    if (id) {
        actions.push(fileRemoved(id));
    }
}

/**
 * Creates a new file that contains the given tags.
 * @param data The object that specifies what tags to set on the file.
 */
export function create(data: any) {
    var id = uuid();

    let event: FileAddedEvent = fileAdded({
        id: id,
        tags: {
            _position: {x:0, y:0, z:0},
            _workspace: null,
            ...data
        }
    });

    actions.push(event);
}

/**
 * Creates a new file that contains tags from the given files or objects.
 * @param files The files or objects to use for the new file's tags.
 */
export function clone(...files: any[]) {
    let id = uuid();

    let originals = files.map(f => {
        return (f && f[isProxy]) ? f[proxyObject].tags : f;
    });

    let newFile = {
        id: id,
        tags: <any>{},
    };

    originals.forEach(o => {
        for (let key in o) {
            newFile.tags[key] = o[key];
        }
    });

    delete newFile.tags._converted;
    delete newFile.tags._original;
    delete newFile.tags.id;

    let event: FileAddedEvent = fileAdded(newFile);

    actions.push(event);
}

/**
 * Combines the two given files.
 * @param first The first file.
 * @param second The second file.
 */
export function combine(first: File | string, second: File | string) {
    event('+', [first, second]);
}

/**
 * Runs an event on the given files.
 * @param name The name of the event to run.
 * @param files The files that the event should be executed on. If null, then the event will be run on every file.
 */
export function event(name: string, files: (File | string)[]) {
    if (!!state) {
        let ids = !!files ? files.map(f => typeof f === 'string' ? f : f.id) : null;
        let results = calculateActionEvents(state, action(name, ids));
        actions.push(...results.events);
    }
}

/**
 * Shouts the given event to every file.
 * @param name The event name.
 */
export function shout(name: string) {
    event(name, null);
}

/**
 * Redirects the user to a context in the given simulation and context.
 * @param simulationId The ID of the simulation to go to.
 * @param context The context to go to. If not provided then the simulation ID will be used as the context.
 */
export function goToContext(simulationId: string, context?: string) {
    if (!context) {
        // Go to context in same simulation
        context = simulationId;
        
        // Grab the simulation ID from the current URL.
        // pathname always starts with a '/' so the first part is actually the second
        // element.
        simulationId = window.location.pathname.split('/')[1];
    }

    // Go to context and simulation
    window.location.pathname = `${simulationId}/${context}`;
}

export default {
    sum,
    avg,
    sqrt,
    abs,
    stdDev,
    sort,
    randomInt,
    random,
    join,
    destroy,
    clone,
    create,
    combine,
    event,
    shout,
    goToContext
};
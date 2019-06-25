import { AuxConfig } from './AuxConfig';
import {
    LocalEvent,
    LocalEvents,
    PrecalculatedFilesState,
    FileEvent,
} from '@casual-simulation/aux-common';
import { StateUpdatedEvent } from '../managers/StateUpdatedEvent';
import { LoadingProgressCallback } from '@casual-simulation/causal-trees';

/**
 * Defines an interface for the static members of an AUX.
 */
export interface AuxStatic {
    /**
     * Creates a new AUX using the given config.
     */
    new (defaultHost: string, config: AuxConfig): Aux;
}

/**
 * Defines an interface for an AUX.
 * That is, a channel that interfaces with the AUX file format in realtime.
 */
export interface Aux {
    /**
     * Initializes the AUX.
     * @param onLocalEvents The callback that should be triggered whenever a local event is emitted from the AUX.
     * @param onStateUpdated The callback that should be triggered whenever the files state is updated.
     * @param onConnectionStateChanged The callback that should be triggered whenever the connection state changes.
     * @param loadingCallback The callback that should be triggered for loading progress.
     */
    init(
        onLocalEvents: (events: LocalEvents[]) => void,
        onStateUpdated: (state: StateUpdatedEvent) => void,
        onConnectionStateChanged: (state: boolean) => void,
        loadingCallback?: LoadingProgressCallback
    ): Promise<void>;

    /**
     * Sends the given list of files events to the AUX for processing.
     * @param events The events.
     */
    sendEvents(events: FileEvent[]): Promise<void>;

    /**
     * Runs the given list of formulas.
     * @param formulas The formulas.
     */
    formulaBatch(formulas: string[]): Promise<void>;

    /**
     * Runs a search on the files state.
     * @param search The search.
     */
    search(search: string): Promise<any>;

    /**
     * Forks the AUX into the channel with the given ID.
     * @param newId The ID that the new AUX should have.
     */
    forkAux(newId: string): Promise<void>;
}

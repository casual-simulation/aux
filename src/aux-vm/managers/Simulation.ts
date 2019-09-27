import {
    SimulationIdParseSuccess,
    LocalActions,
    AuxOp,
} from '@casual-simulation/aux-common';
import { FileWatcher } from './FileWatcher';
import { Observable } from 'rxjs';
import {
    StoredCausalTree,
    DeviceAction,
} from '@casual-simulation/causal-trees';
import { Initable } from './Initable';
import { BotHelper } from './FileHelper';
import { ConnectionManager } from './ConnectionManager';
import { AuxChannelErrorType } from '../vm/AuxChannelErrorTypes';
import { CodeLanguageManager } from './CodeLanguageManager';

/**
 * Defines an interface for objects that represent file simulations.
 */
export interface Simulation extends Initable {
    /**
     * Gets the ID of the simulation that is currently being used.
     */
    id: string;

    /**
     * Gets the parsed ID of the simulation.
     */
    parsedId: SimulationIdParseSuccess;

    /**
     * Gets whether the app is connected to the server but may
     * or may not be synced to the serer.
     */
    isOnline: boolean;

    /**
     * Gets whether the app is synced to the server.
     */
    isSynced: boolean;

    /**
     * Gets the file helper.
     */
    helper: BotHelper;

    /**
     * Gets the file watcher.
     */
    watcher: FileWatcher;

    /**
     * Gets the manager in charge of the server connection status.
     */
    connection: ConnectionManager;

    /**
     * Gets the manager in charge of code services.
     */
    code: CodeLanguageManager;

    /**
     * Gets the observable list of events that should have an effect on the UI.
     */
    localEvents: Observable<LocalActions>;

    /**
     * Gets the observable list of events that were received from a remote device.
     */
    deviceEvents: Observable<DeviceAction>;

    /**
     * Gets the observable list of errors from the simulation.
     */
    onError: Observable<AuxChannelErrorType>;

    // TODO: This seems like a pretty dangerous function to keep around,
    // but we'll add a config option to prevent this from happening on real sites.
    deleteEverything(): Promise<void>;

    /**
     * Forks the current session's aux into the given session ID.
     * @param forkName The ID of the new session.
     */
    forkAux(forkName: string): Promise<void>;

    /**
     * Exports the atoms for the given files.
     * @param fileIds The files to export.
     */
    exportFiles(fileIds: string[]): Promise<StoredCausalTree<AuxOp>>;

    /**
     * Exports the causal tree for the simulation.
     */
    exportTree(): Promise<StoredCausalTree<AuxOp>>;
}

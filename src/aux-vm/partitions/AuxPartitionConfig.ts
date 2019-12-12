import { BotsState, AuxCausalTree } from '@casual-simulation/aux-common';
import { User } from '@casual-simulation/causal-trees';
import { CausalRepoClient } from '@casual-simulation/causal-trees/core2';
import { AuxPartition } from './AuxPartition';

/**
 * Defines a set of options for configuring partitioning of bots.
 * Bot IDs are mapped to
 */
export interface AuxPartitionConfig {
    '*': PartitionConfig;
    [key: string]: PartitionConfig;
}

/**
 * Defines a partition config.
 * That is, a config which specifies how to build a partition.
 */
export type PartitionConfig =
    | RemoteCausalTreePartitionConfig
    | CausalTreePartitionConfig
    | CausalRepoPartitionConfig
    | RemoteCausalRepoPartitionConfig
    | CausalRepoClientPartitionConfig
    | MemoryPartitionConfig
    | ProxyPartitionConfig
    | LocalStoragePartitionConfig;

/**
 * Defines a base interface for partitions.
 */
export interface PartitionConfigBase {
    /**
     * Whether the partition is private.
     * If true, then the contents of the partition should not be exported.
     * If false, then the bot state in the partition is exportable.
     * Defaults to false.
     */
    private?: boolean;
}

/**
 * Defines a memory partition.
 * That is, a configuration that specifies that bots should be stored in memory.
 */
export interface MemoryPartitionConfig extends PartitionConfigBase {
    type: 'memory';

    /**
     * The initial state for the memory partition.
     */
    initialState: BotsState;
}

/**
 * Defines a partition that proxies requests from the engine to the given partition instance.
 * Basically gives a way to run a partition on the main thread instead of in a background thread.
 * Useful for storing data using APIs that are only available to the main thread.
 */
export interface ProxyPartitionConfig extends PartitionConfigBase {
    type: 'proxy';

    /**
     * The partition that should be used.
     */
    partition: AuxPartition;
}

/**
 * Defines a partition that stores data in local storage.
 */
export interface LocalStoragePartitionConfig extends PartitionConfigBase {
    type: 'local_storage';

    /**
     * The namespace that the partition should store bots under.
     */
    namespace: string;
}

/**
 * Defines a causal tree partition.
 * That is, a configuration that specifies that bots should be stored in a causal tree.
 */
export interface CausalTreePartitionConfig extends PartitionConfigBase {
    type: 'causal_tree';

    /**
     * The tree to use.
     */
    tree: AuxCausalTree;

    /**
     * The ID of the tree.
     */
    id: string;
}

/**
 * Defines a causal tree partition that uses the new Causal Repo API.
 */
export interface CausalRepoPartitionConfig extends PartitionConfigBase {
    type: 'causal_repo';
}

/**
 * Defines a causal tree partition that uses the new Causal Repo API.
 */
export interface CausalRepoClientPartitionConfig extends PartitionConfigBase {
    type: 'causal_repo_client';

    /**
     * The branch to load.
     */
    branch: string;

    /**
     * The client that should be used to connect.
     */
    client: CausalRepoClient;

    /**
     * Whether the partition should be loaded in read-only mode.
     */
    readOnly?: boolean;
}

/**
 * Defines a causal tree partition that uses the new Causal Repo API.
 */
export interface RemoteCausalRepoPartitionConfig extends PartitionConfigBase {
    type: 'remote_causal_repo';

    /**
     * The branch to load.
     */
    branch: string;

    /**
     * The host that the branch should be loaded from.
     */
    host: string;

    /**
     * Whether the partition should be loaded in read-only mode.
     */
    readOnly?: boolean;
}

/**
 * Defines a remote causal tree partition.
 * That is, a configuration that specifies that bots should be stored in a causal tree
 * which is loaded from a remote server.
 */
export interface RemoteCausalTreePartitionConfig extends PartitionConfigBase {
    type: 'remote_causal_tree';

    /**
     * The ID of the tree.
     */
    id: string;

    /**
     * The host that should be connected to.
     */
    host: string;

    /**
     * The name of the tree to load.
     */
    treeName: string;
}

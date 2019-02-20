import { WeaveVersion } from "./WeaveVersion";

/**
 * Defines an interface for version information
 * about a client's data state.
 */
export interface SiteVersionInfo {
    /**
     * The site ID of the peer that this info is for.
     * Null if the peer does not have a site ID.
     */
    siteId: number | null;

    /**
     * Gets the version that the weave for this site is at.
     */
    version: WeaveVersion;
}

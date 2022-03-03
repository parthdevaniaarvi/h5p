import {
    ContentId,
    ISerializedContentUserData,
    IUser,
    IContentUserDataStorage,
    IContentUserData
} from './types';
import Logger from './helpers/Logger';
import H5pError from './helpers/H5pError';

const log = new Logger('ContentUserDataManager');

/**
 * The ContentUserDataManager takes care of saving user data and states. It only
 * contains storage-agnostic functionality and depends on a
 * ContentUserDataStorage object to do the actual persistence.
 */
export default class ContentUserDataManager {
    /**
     * @param contentUserDataStorage The storage object
     */
    constructor(private contentUserDataStorage: IContentUserDataStorage) {
        log.info('initialize');
    }

    /**
     * Deletes a contentUserData object for given contentId and userId. Throws
     * errors if something goes wrong.
     * @param contentId The content id to delete.
     * @param userId the userId for which the contentUserData object should be
     * deleted
     * @param requestingUser The user who wants to delete the content (not the
     * user the contentUserData belongs to)
     */
    public async deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.debug(
                `deleting contentUserData for ContentId ${contentId} and userId ${userId}`
            );
            return this.contentUserDataStorage.deleteContentUserDataByUserId(
                contentId,
                userId,
                requestingUser
            );
        }
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.debug(
                `deleting all contentUserData for ContentId ${contentId}`
            );
            return this.contentUserDataStorage.deleteAllContentUserDataByContentId(
                contentId,
                requestingUser
            );
        }
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who is accessing the h5p
     * @returns the saved state as string or undefined when not found
     */
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IContentUserData> {
        if (!this.contentUserDataStorage) {
            return undefined;
        }

        log.debug(
            `loading contentUserData for user with id ${user.id} and contentId ${contentId}`
        );

        return this.contentUserDataStorage.loadContentUserData(
            contentId,
            dataType,
            subContentId,
            user
        );
    }

    /**
     * Loads the content user data for given contentId and user. The returned data
     * is an array of IContentUserData where the position in the array
     * corresponds with the subContentId or undefined if there is no
     * content user data.
     *
     * @param contentId The id of the content to load user data from
     * @param user The user who is accessing the h5p
     * @returns an array of IContentUserData or undefined if no content user data
     * is found.
     */
    public async generateContentUserDataIntegration(
        contentId: ContentId,
        user: IUser
    ): Promise<ISerializedContentUserData[]> {
        log.debug(
            `generating contentUserDataIntegration for user with id ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        const states = await this.contentUserDataStorage.listByContent(
            contentId,
            user.id
        );

        const sortedStates = states.sort(
            (a, b) => Number(a.subContentId) - Number(b.subContentId)
        );

        const mappedStates = sortedStates
            // filter removes states where preload is set to false
            .filter((state) => state.preload)
            // maps the state to an object where the key is the dataType and the userState is the value
            .map((state) => ({
                [state.dataType]: state.userState
            }));

        return mappedStates;
    }

    /**
     * Saves data when a user completes content.
     * @param contentId The content id to delete.
     * @param score the score the user reached as an integer
     * @param maxScore the maximum score of the content
     * @param openend the time the user opened the content as UNIX time
     * @param finishedTimestamp the time the user finished the content as UNIX time
     * @param completionTime the time the user needed to complete the content (as integer)
     * @param user The user who triggers this method via /setFinished
     */
    public async setFinished(
        contentId: ContentId,
        score: number,
        maxScore: number,
        openedTimestamp: number,
        finishedTimestamp: number,
        completionTime: number,
        user: IUser
    ): Promise<void> {
        log.debug(
            `saving finished data for ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        await this.contentUserDataStorage.saveFinishedDataForUser(
            contentId,
            score,
            maxScore,
            openedTimestamp,
            finishedTimestamp,
            completionTime,
            user
        );
    }

    /**
     * Saves the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param userState The userState as string
     * @param user The user who owns this object
     * @returns the saved state as string
     */
    public async saveContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser
    ): Promise<void> {
        log.debug(
            `saving contentUserData for user with id ${user.id} and contentId ${contentId}`
        );

        if (typeof invalidate !== 'boolean' || typeof preload !== 'boolean') {
            log.error(`invalid arguments passed for contentId ${contentId}`);
            throw new Error(
                "saveContentUserData received invalid arguments: invalidate or preload weren't boolean"
            );
        }

        if (invalidate) {
            log.debug(
                `invalidating contentUserData for user with id ${user.id} and contentId ${contentId}`
            );
            return this.contentUserDataStorage.deleteContentUserDataByUserId(
                contentId,
                user.id,
                user
            );
        }

        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.saveContentUserData(
                contentId,
                dataType,
                subContentId,
                userState,
                invalidate,
                preload,
                user
            );
        }
    }
}

import * as express from 'express';
import {
    ContentUserDataManager,
    IAjaxResponse,
    IPostContentUserData,
    AjaxSuccessResponse
} from '@lumieducation/h5p-server';

import { IRequestWithUser } from '../expressTypes';

interface IPostContentUserDataRequest
    extends IPostContentUserData,
        IRequestWithUser {}

export default class ContentUserDataController {
    constructor(protected contentUserDataManager: ContentUserDataManager) {}

    /**
     * Returns the userState for given contentId, dataType and subContentId
     */
    public getContentUserData = async (
        req: IRequestWithUser,
        res: express.Response<IAjaxResponse<string>>
    ): Promise<void> => {
        const { contentId, dataType, subContentId } = req.params;
        const result = await this.contentUserDataManager.getContentUserData(
            contentId,
            dataType,
            subContentId,
            req.user
        );

        if (!result || !result.userState) {
            res.status(200).json(new AjaxSuccessResponse(false));
        } else {
            res.status(200).json(new AjaxSuccessResponse(result.userState));
        }
    };

    /**
     * Saving a userState for given contentId, dataType and subContentId
     *
     */
    public postContentUserData = async (
        req: IPostContentUserDataRequest,
        res: express.Response
    ): Promise<void> => {
        const { contentId, dataType, subContentId } = req.params;
        const { user, body } = req;

        await this.contentUserDataManager.createOrUpdateContentUserData(
            contentId,
            dataType,
            subContentId,
            body.data,
            body.invalidate === 1 || body.invalidate === '1',
            body.preload === 1 || body.preload === '1',
            user
        );

        res.status(200).end();
    };
}

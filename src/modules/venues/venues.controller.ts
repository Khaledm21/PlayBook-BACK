import { Request, Response, NextFunction } from 'express';
import { VenueService } from './venues.service';
import { sendSuccess } from '../../utils/response';
import { CreateVenueInput, GetVenuesQuery, UpdateVenueInput } from './venues.schema';
import { BadRequestError } from '../../utils/errors';

export class VenueController {
  static async getVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as GetVenuesQuery;
      const result = await VenueService.getVenues(query);

      return sendSuccess(res, result.venues, 200, 'تم استرجاع الملاعب بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getVenueById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const venue = await VenueService.getVenueByIdOrSlug(id);

      return sendSuccess(res, venue, 200, 'تم استرجاع تفاصيل الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getMyVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const venues = await VenueService.getOwnerVenues(ownerId);

      return sendSuccess(res, venues, 200, 'تم استرجاع ملاعبك الخاصة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async createVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const body = req.body as CreateVenueInput;
      const venue = await VenueService.createVenue(ownerId, body, isAdmin);

      return sendSuccess(res, venue, 201, 'تم إنشاء مجمع الملاعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const body = req.body as UpdateVenueInput;
      const updated = await VenueService.updateVenue(id, ownerId, isAdmin, body);

      return sendSuccess(res, updated, 200, 'تم تحديث بيانات الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async deleteVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      await VenueService.deleteVenue(id, ownerId, isAdmin);

      return sendSuccess(res, { success: true }, 200, 'تم حذف مجمع الملاعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new BadRequestError('لم يتم إرسال أي صور للرفع');
      }

      const imageUrls = files.map((f) => `/uploads/venues/${f.filename}`);
      const updated = await VenueService.addImages(id, ownerId, isAdmin, imageUrls);

      return sendSuccess(res, updated, 200, 'تم رفع الصور بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

